"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Check, Edit, LogIn, ChevronDown } from "lucide-react";

type RegisterFormData = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  shi_segment: string;
};

export default function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) router.replace("/wins");
    };
    checkUser();
  }, [router]);

  const [formData, setFormData] = useState<RegisterFormData>({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    shi_segment: "",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    setIsLoading(false);

    if (!res.ok) setError(data.error || "Registration failed");
    else setSuccess("Registration successful. Please verify your email.");
  };

  return (
    <div className="flex w-full bg-white">

      {/* ── Left Side: Fixed Panel — pure Tailwind ── */}
      <div className="hidden lg:flex fixed top-0 left-0 w-1/2 h-screen z-10 flex-col text-white overflow-hidden bg-[#1D3938]">
        {/* <img
          src="/banner1.png"
          alt="Registration Banner"
          className="absolute inset-0 w-full h-full object-cover object-top"
        /> */}

        <div className="relative z-10">
          <div className="max-w-2xl space-y-3 2xl:space-y-10 grid justify-center items-between pt-40 xl:pt-45  mx-auto">
            <div>
              <h1 className="lg:text-[32px] 2xl:text-[40px] font-semibold mb-4">
                Welcome to Logi-ACE CDW
              </h1>
              <p className="text-white/90 font-inter font-normal lg:text-[18px] xl:text-[20px] 2xl:text-[22px] lg:max-w-[440px] xl:max-w-[550px] 2xl:max-w-[600px]">
                Get started by registering your account follow these simple steps to create and manage your demo kits!
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
                text="Sign in to your account once it’s approved."
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Side: Scrollable Form — margin-left to clear fixed panel ── */}
      <div className="w-full lg:ml-[50%] flex items-center  justify-center px-6 lg:px-12 pt-2 py-5 lg:py-5 xl:py-5 2xl:py-10 pb-8 bg-white">
        <div className="w-full max-w-[450px] xl:max-w-[480px]  bg-white border border-gray-100 rounded-3xl shadow-sm p-8 lg:p-10 mb-8 mt-[-6px]">
          <h1 className="text-2xl font-inter text-center text-gray-900 mb-8 mt-2">Registration</h1>


          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-2">
              <label className="text-[14px] font-medium text-gray-700">Email/Username</label>
              <input
                type="email"
                required
                className="w-full h-[40px] px-4 rounded-md border-none bg-gray-100/100 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-2"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-medium text-gray-700">Full Name</label>
              <input
                required
                className="w-full h-[40px] px-4 rounded-md border-none bg-gray-100/100 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-2"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>

            <div className="hidden space-y-2">
              <label className="text-[14px] font-medium text-gray-700">Last Name</label>
              <input
                className="w-full h-[40px] px-4 rounded-md border-none bg-gray-100/100  text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-2"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                className="w-full h-[40px] px-4 rounded-md border-none bg-gray-100/100  text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-2"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                required
                className="w-full h-[40px] px-4 rounded-md border-none bg-gray-100/100 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-2"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              />
            </div>


            <div className="space-y-2">
              <label className="text-[14px] font-medium text-gray-700">SHI Segment</label>
              <div className="relative mt-2">
                <select
                  required
                  className="w-full h-[40px] px-4 pr-10 rounded-md border-none bg-gray-100/100 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                  value={formData.shi_segment}
                  onChange={(e) => setFormData({ ...formData, shi_segment: e.target.value })}
                >
                  <option value=""></option>
                  <option>Commercial Inside Sales</option>
                  <option>Enterprise Field Sales</option>
                  <option>Enterprise Inside Sales (Austin)</option>
                  <option>Federal</option>
                  <option>Global Sales</option>
                  <option>Healthcare</option>
                  <option>International</option>
                  <option>Public Sector Field</option>
                  <option>Public Sector Inside</option>
                  <option>SMB</option>
                  <option>Strategic Sales</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[50px] rounded-md bg-[#76E6D1] text-[#333333] font-medium text-[16px] hover:bg-[#5ccdc0] transition-all disabled:opacity-50"
            >
              {isLoading ? "Registering..." : "Register"}
            </button>

            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 p-4 rounded-xl">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 text-sm text-green-600 bg-green-50 border border-green-100 p-4 rounded-xl">
                {success}
              </div>
            )}

            <div className="text-center mt-1">
              <span className="text-[14px] text-gray-600">Already have an account? </span>
              <a href="/login" className="text-[14px] text-gray-500 hover:text-gray-800 underline underline-offset-4 transition-colors">
                Login
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* STEP ITEM */
function Step({ icon, title, text }: any) {
  return (
    <div className="flex gap-4 items-start">
      <div className="mt-1">{icon}</div>
      <div>
        <p className="font-semibold text-[19px]">{title}</p>
        <p className="text-md text-white/80 text-[16px] mt-0.5">{text}</p>
      </div>
    </div>
  );
}