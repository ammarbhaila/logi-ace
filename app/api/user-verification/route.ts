import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

class PasswordHash {
    private itoa64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    checkPassword(password: string, storedHash: string) {
        const hash = this.cryptPrivate(password, storedHash);
        const hashBuffer = Buffer.from(hash);
        const storedBuffer = Buffer.from(storedHash);

        if (hashBuffer.length !== storedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(hashBuffer, storedBuffer);
    }

    private cryptPrivate(password: string, setting: string) {
        let output = "*0";
        if (setting.substring(0, 2) === "*0") output = "*1";

        const id = setting.substring(0, 3);
        if (id !== "$P$" && id !== "$H$") return output;

        const countLog2 = this.itoa64.indexOf(setting[3]);
        if (countLog2 < 7 || countLog2 > 30) return output;

        const count = 1 << countLog2;
        const salt = setting.substring(4, 12);
        if (salt.length !== 8) return output;

        let hash = crypto.createHash("md5").update(salt + password).digest();

        for (let i = 0; i < count; i++) {
            hash = crypto
                .createHash("md5")
                .update(Buffer.concat([hash, Buffer.from(password)]))
                .digest();
        }

        return setting.substring(0, 12) + this.encode64(hash, 16);
    }

    private encode64(input: Buffer, count: number) {
        let output = "";
        let i = 0;

        do {
            let value = input[i++];
            output += this.itoa64[value & 0x3f];

            if (i < count) value |= input[i] << 8;
            output += this.itoa64[(value >> 6) & 0x3f];

            if (i++ >= count) break;
            if (i < count) value |= input[i] << 16;
            output += this.itoa64[(value >> 12) & 0x3f];

            if (i++ >= count) break;
            output += this.itoa64[(value >> 18) & 0x3f];
        } while (i < count);

        return output;
    }
}

function verifyWordPressPassword(password: string, storedHash: string): boolean {
    if (!password || !storedHash) return false;

    // WordPress 6.8+ format: $wp$2y$...
    if (storedHash.startsWith("$wp$")) {
        const passwordToVerify = crypto
            .createHmac("sha384", "wp-sha384")
            .update(password)
            .digest("base64");

        const bcryptHash = storedHash.substring(3); // remove "$wp"

        // First try the wp-sha384 HMAC hash (standard WP 6.8+ behavior)
        if (bcrypt.compareSync(passwordToVerify, bcryptHash)) {
            return true;
        }

        // Fallback: try raw password (some custom WP plugins / Bedrock setups do this)
        return bcrypt.compareSync(password, bcryptHash);
    }

    // Legacy phpass
    if (storedHash.startsWith("$P$") || storedHash.startsWith("$H$")) {
        const hasher = new PasswordHash();
        return hasher.checkPassword(password, storedHash);
    }

    // Plain bcrypt
    if (
        storedHash.startsWith("$2y$") ||
        storedHash.startsWith("$2b$") ||
        storedHash.startsWith("$2a$")
    ) {
        return bcrypt.compareSync(password, storedHash);
    }

    // Very old md5 fallback
    if (storedHash.length <= 32) {
        const md5 = crypto.createHash("md5").update(password).digest("hex");
        return crypto.timingSafeEqual(Buffer.from(md5), Buffer.from(storedHash));
    }

    return false;
}

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        console.log("wp-upgrade:start", { email });

        if (!email || !password) {
            return NextResponse.json(
                { error: "Missing email or password" },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const emailLower = String(email).trim().toLowerCase();

        // 1. Get WP hash
        const { data: wp, error: wpErr } = await admin
            .from("wp_pass")
            .select("hash")
            .eq("email", emailLower)
            .single();

        // 1b. Also check profile table for existence
        const { data: profileExists } = await admin
            .from("profile")
            .select("id")
            .eq("email", emailLower)
            .single();

        // console.log("wp-upgrade:userCheck", {
        //     email: emailLower,
        //     inWpPass: !!wp?.hash,
        //     inProfile: !!profileExists
        // });

        if (!wp?.hash && !profileExists) {
            return NextResponse.json(
                { error: "User not existing" },
                { status: 404 }
            );
        }

        if (!wp?.hash) {
            // User exists in profile but not legacy wp_pass, 
            // since normal login failed before calling this, it must be wrong password.
            return NextResponse.json(
                { error: "incorrect password" },
                { status: 401 }
            );
        }

        const storedHash = String(wp.hash || "");
        const ok = verifyWordPressPassword(password, storedHash);

        console.log("wp-upgrade:hashDebug", {
            storedHashPrefix: storedHash.substring(0, 20),
            storedHashLength: storedHash.length,
            storedHashType: storedHash.startsWith("$wp$")
                ? "WordPress bcrypt ($wp$)"
                : storedHash.startsWith("$P$")
                    ? "PHPass $P$"
                    : storedHash.startsWith("$H$")
                        ? "PHPass $H$"
                        : (storedHash.startsWith("$2y$") ||
                            storedHash.startsWith("$2b$") ||
                            storedHash.startsWith("$2a$"))
                            ? "BCrypt"
                            : "Unknown",
            hashesMatch: ok,
        });

        if (!ok) {
            console.log("wp-upgrade:hashCheck", { email: emailLower, ok: false });
            return NextResponse.json(
                { error: "incorrect password" },
                { status: 401 }
            );
        }

        console.log("wp-upgrade:hashCheck", { email: emailLower, ok: true });

        // 2. Check if auth user already exists
        let targetUserId: string | null = null;
        let page = 1;
        const perPage = 200;

        while (true) {
            const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({
                page,
                perPage,
            });

            if (listErr) break;

            const found = (usersPage?.users || []).find(
                (u) => String(u.email || "").toLowerCase() === emailLower
            );

            if (found) {
                targetUserId = found.id;
                break;
            }

            if (!usersPage || (usersPage.users || []).length < perPage) break;
            page += 1;
        }

        // 3. If not found in auth, create it
        if (!targetUserId) {
            const { data: profileData } = await admin
                .from("profile")
                .select("id, first_name, last_name, userrole")
                .eq("email", emailLower)
                .single();

            const { data: createdUser, error: createErr } =
                await admin.auth.admin.createUser({
                    email: emailLower,
                    password,
                    email_confirm: true,
                    user_metadata: {
                        first_name: profileData?.first_name || "",
                        last_name: profileData?.last_name || "",
                        role: profileData?.userrole || "user",
                        migrated_from_legacy: true,
                    },
                });

            if (createErr || !createdUser?.user) {
                return NextResponse.json(
                    { error: createErr?.message || "Failed to create account" },
                    { status: 500 }
                );
            }

            targetUserId = createdUser.user.id;
            console.log("wp-upgrade:createdAuthUser", {
                email: emailLower,
                userId: targetUserId,
            });
        } else {
            // 4. If exists in auth, update password to the one user just entered
            const { error: updErr } = await admin.auth.admin.updateUserById(
                targetUserId,
                { password }
            );

            if (updErr) {
                return NextResponse.json(
                    { error: "Failed to update password" },
                    { status: 500 }
                );
            }
        }

        // 5. Update profile with auth userId
        const { error: profileErr } = await admin
            .from("profile")
            .update({ userId: targetUserId })
            .eq("email", emailLower);

        if (profileErr) {
            console.log("wp-upgrade:profileUpdateError", profileErr.message);
            return NextResponse.json(
                { error: "Failed to sync profile" },
                { status: 500 }
            );
        }

        // 6. Remove legacy wp hash
        const { error: delErr } = await admin
            .from("wp_pass")
            .delete()
            .eq("email", emailLower);

        if (delErr) {
            console.log("wp-upgrade:wpPassDeleteError", delErr.message);
        }

        console.log("wp-upgrade:success", { email: emailLower, userId: targetUserId });

        return NextResponse.json({
            success: true,
            existsInAuth: true,
            userId: targetUserId,
        });
    } catch (error: any) {
        console.log("wp-upgrade:catch", error);
        return NextResponse.json(
            { error: error?.message || "Invalid request" },
            { status: 400 }
        );
    }
}