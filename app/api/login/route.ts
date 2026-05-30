import { NextResponse } from "next/server";
import { supabasePlain as supabase } from "@/lib/supabasePlain";  // Make sure you're using correct Supabase client

export async function POST(req: Request) {
  const { email, password } = await req.json();

  try {
    // Supabase Auth login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: "Invalid credentials or user not found" },
        { status: 400 }
      );
    }

    // Check if session is created successfully
    const { data: { session } } = await supabase.auth.getSession();

    // Log the session to debug if it's set
    console.log("Session after login:", session);

    if (session) {
      // Session successfully set, return user data and success response
      console.log("Session found:", session);
      return NextResponse.json({ user: data.user, success: true });
    } else {
      // If session is not set, handle the error
      console.log("No session found");
      return NextResponse.json(
        { error: "Session not found. Please try again." },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("Error during login:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
