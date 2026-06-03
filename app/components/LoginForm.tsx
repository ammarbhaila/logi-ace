"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { Edit, Check, LogIn } from "lucide-react";

function Step({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-white">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-[19px]">{title}</p>
        <p className="text-white/80 text-[16px] mt-0.5">{text}</p>
      </div>
    </div>
  );
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setSession(session);

        try {
          const meRes = await fetch("/api/auth/me", { cache: "no-store" });
          if (meRes.ok) {
            const profile = await meRes.json();

            const email = profile?.email || "";
            const domain = email.split("@")[1]?.toLowerCase();
            const isAutoDomain = ["works360.com", "cdwg.com", "cdw.com", "logitech.com"].includes(domain);

            if (isAutoDomain && profile?.is_verified === false) {
              await supabase.auth.signOut();
              return;
            }

            if (profile?.is_approved === false) {
              await supabase.auth.signOut();
              return;
            }

            // Check both 'next' and 'redirect_to' parameters
            const nextParam = searchParams.get("next") || searchParams.get("redirect_to");

            if (nextParam) {
              // Ensure we don't have double slashes
              const cleanPath = nextParam.startsWith('/') ? nextParam : `/${nextParam}`;
              window.location.href = cleanPath;
            } else {
              window.location.href = "/";
            }
          }
        } catch (err) {
          console.error("Failed to check profile:", err);
        }
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router, searchParams]);

  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
    };

    let isValid = true;

    if (!email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSuccessfulLogin = async () => {
    try {
      const meRes = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
      });

      if (meRes.ok) {
        const profile = await meRes.json();

        if (profile) {
          const email = profile.email || "";
          const domain = email.split("@")[1]?.toLowerCase();
          const isAutoDomain = ["insight.com", "intel.com", "works360.com"].includes(domain);
          if (isAutoDomain && profile.is_verified === false) {
            toast.error("Please verify your email to activate your account.");
            setIsLoading(false);

            setTimeout(async () => {
              await supabase.auth.signOut();
            }, 6000); // 6000 ms = 6 seconds

            return;
          }
          if (profile.is_approved === false) {
            // await supabase.auth.signOut();
            toast.error("Your account is pending approval.");
            setIsLoading(false);

            setTimeout(async () => {
              await supabase.auth.signOut();
            }, 6000); // 6000 ms = 6 seconds

            return;
          }
        }
      }
    } catch (err) {
      console.error("Profile check failed:", err);
      toast.error("Unable to verify account status.");
      setIsLoading(false);
      return;
    }

    try {
      await fetch("/api/auth/update-login", {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to update login stats:", err);
    }

    // toast.success("Login successful");

    // Check both 'next' and 'redirect_to' parameters
    const nextParam = searchParams.get("next") || searchParams.get("redirect_to");
    const redirectPath = nextParam
      ? (nextParam.startsWith('/') ? nextParam : `/${nextParam}`)
      : "/";

    setTimeout(() => {
      window.location.href = redirectPath;
    }, 500);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);

    if (!validateForm()) {
      // toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      // 1. First try normal Supabase login
      const { data: normalAuthData, error: normalAuthError } =
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (!normalAuthError && normalAuthData?.user) {
        await handleSuccessfulLogin();
        return;
      }

      // 2. If normal login fails, try legacy WP verification + migration
      try {
        const verifyResponse = await fetch("/api/user-verification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
            keepSignedIn,
          }),
        });

        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text();

          try {
            const errorData = JSON.parse(errorText);
            const errorMessage = errorData.error || "Invalid credentials";

            if (errorMessage === "User not existing") {
              toast.error("User not existing");
            } else {
              toast.error(errorMessage);
            }
          } catch {
            toast.error("Authentication failed. Please try again.");
          }

          setIsLoading(false);
          return;
        }

        const verifyData = await verifyResponse.json();

        if (!verifyData.success) {
          toast.error(verifyData.error || "Invalid credentials");
          setIsLoading(false);
          return;
        }

        // 3. If user now exists in Supabase Auth, try sign in again
        if (verifyData.existsInAuth) {
          const { data: newAuthData, error: newAuthError } =
            await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            });

          if (newAuthError || !newAuthData?.user) {
            if (verifyData.needsPasswordUpdate) {
              toast.error("Account needs password update. Please reset your password.");
            } else {
              toast.error("incorrect password");
            }
            setIsLoading(false);
            return;
          }

          await handleSuccessfulLogin();
          return;
        }

        toast.error("Account not found or not migrated");
        setIsLoading(false);
      } catch (apiError) {
        console.error("Legacy auth error:", apiError);
        toast.error("Authentication service unavailable");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Authentication error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-115px)]">
      <div
        className="hidden lg:flex text-white lg:pl-10 2xl:pl-20 items-center"
        style={{
          backgroundImage: "url('/banner1.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-2xl space-y-5 2xl:space-y-10">
          <div>
            <h1 className="lg:text-[32px] 2xl:text-[40px] font-semibold mb-4">
              Welcome to Logi-ACE CDW
            </h1>
            <p className="text-white/90 font-inter font-normal lg:text-[18px] xl:text-[20px] 2xl:text-[22px] lg:max-w-[440px] xl:max-w-[550px] 2xl:max-w-[600px]">
              Get started by registering your account and follow the simple
              steps to create and manage your Demo Kits.
            </p>
          </div>

          <div className="space-y-6 lg:space-y-3 2xl:space-y-6 lg:mt-10 2xl:mt-0">
            <Step
              icon={<Edit size={26} />}
              title="Register"
              text="Fill out a quick registration form if not registered yet."
            />
            <Step
              icon={<Check size={26} />}
              title="Approval"
              text="Your registration will be approved by the Program Manager."
            />
            <Step
              icon={<LogIn size={26} />}
              title="Login"
              text="Sign in to your account once it's approved."
            />
          </div>
        </div>
      </div>

      <div className="w-full flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[500px] bg-white border border-gray-200 rounded-2xl shadow-sm px-10 pt-15 pb-[70px]">
          <h1 className="text-[27px] font-medium text-center text-gray-900 mb-6 -mt-2">
            Login
          </h1>

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-2 w-full max-w-[395px] mx-auto">
              <label className="text-[14px] font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                className="w-full h-[44px] px-4 rounded-md border-none bg-gray-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
              />
              {submitted && errors.email && (
                <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">
                  {errors.email}
                </div>
              )}
            </div>

            <div className="space-y-1.5 w-full max-w-[395px] mx-auto">
              <label className="text-[14px] font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                className="w-full h-[44px] px-4 rounded-md border-none bg-gray-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {submitted && errors.password && (
                <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">
                  {errors.password}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2.5 w-full max-w-[386px] mx-auto">
              <input
                type="checkbox"
                id="keepSignedIn"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="w-4 h-3.5 border border-gray-300 rounded cursor-pointer accent-[#213643]"
              />
              <label
                htmlFor="keepSignedIn"
                className="text-[12px] text-gray-600 cursor-pointer"
              >
                Keep me signed in
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1 justify-center items-center">
              <button
                type="submit"
                disabled={isLoading}
                className="h-[48px] w-full sm:w-[185px] rounded-[2px] bg-[#213643] text-white font-semibold text-[15px] hover:bg-[#1a2b35] transition-all disabled:opacity-50"
              >
                {isLoading ? "Logging in..." : "Login"}
              </button>

              <Link
                href="/register"
                className="h-[48px] w-full sm:w-[185px] rounded-[2px] border border-gray-900 text-gray-900 font-semibold text-[15px] flex items-center justify-center hover:bg-gray-50 transition-all"
              >
                Register
              </Link>
            </div>

            <div className="text-center pt-1">
              <Link
                href="/forgot-password"
                className="text-[14px] text-gray-500 hover:text-gray-800 underline underline-offset-4 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}