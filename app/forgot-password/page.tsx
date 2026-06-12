"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Edit, Check, LogIn } from 'lucide-react';

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

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Reset link sent to your email!');
                setTimeout(() => router.push('/login'), 2000);
            } else {
                toast.error(data.error || 'Something went wrong');
            }
        } catch (error) {
            toast.error('Failed to send reset link');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-115px)]">

            {/* LEFT BANNER */}
            <div
                className="hidden lg:flex text-white lg:pl-10 2xl:pl-20 items-center"
                style={{
                    // backgroundImage: "url('/banner1.png')",
                    // backgroundSize: "cover",
                    // backgroundPosition: "center",
                    backgroundColor: "#1D3938",
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
                <div className="w-full max-w-[450px] bg-white border border-gray-200 rounded-2xl shadow-sm px-10 pt-15 pb-[50px]">
                    <div className="flex justify-center mb-3"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw-key text-gray-800" aria-hidden="true"><path d="m14.5 9.5 1 1"></path><path d="m15.5 8.5-4 4"></path><path d="M3 12a9 9 0 1 0 9-9 9.74 9.74 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><circle cx="10" cy="14" r="2"></circle></svg></div>
                    <h1 className="text-3xl font-inter text-center text-gray-900 mb-2">Forgot Password</h1>
                    <p className="text-center text-gray-500 mb-8 text-sm">Enter your email to receive a reset link</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="text-[14px] font-medium text-gray-700">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full h-[40px] px-4 rounded-md border-none bg-gray-100/100 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-1"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <button
                            disabled={isLoading}
                            className="w-[98%] h-[49px] mx-auto block rounded-xl bg-[#76E6D1] text-[#333333] font-medium text-[16px] hover:bg-[#5ccdc0] transition-all disabled:opacity-50 mt-3"
                        >
                            {isLoading ? "Sending Link..." : "Send Reset Link"}
                        </button>

                        <div className="text-center">
                            <a href="/login" className="text-[14px] text-gray-500 hover:text-gray-800 underline underline-offset-4 transition-colors">Back to Login</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
