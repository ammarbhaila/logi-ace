"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
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

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!token) {
            toast.error('Invalid link - token missing');
            router.push('/login');
        }
    }, [token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Password updated successfully!');
                setTimeout(() => router.push('/login'), 2000);
            } else {
                toast.error(data.error || 'Failed to reset password');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex w-full bg-white overflow-hidden lg:min-h-[calc(100vh-140px)]">
            {/* LEFT BANNER */}
            <div
                className="hidden lg:flex lg:w-1/2 text-white lg:pl-10 2xl:pl-20 items-center"
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

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-4">
                <div className="w-full max-w-[440px] bg-white border border-gray-100 rounded-3xl shadow-sm p-8 lg:p-6 my-4">
                    <div className="flex justify-center mb-3"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw-key text-gray-800" aria-hidden="true"><path d="m14.5 9.5 1 1"></path><path d="m15.5 8.5-4 4"></path><path d="M3 12a9 9 0 1 0 9-9 9.74 9.74 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><circle cx="10" cy="14" r="2"></circle></svg></div>
                    <h1 className="text-3xl font-inter text-center text-gray-900 mb-2">Reset Password</h1>
                    <p className="text-center text-gray-500 mb-8 text-sm">Select a new secure password</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="text-[14px] font-medium text-gray-700">New Password</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                className="w-full h-[44px] px-4 rounded-md border-none bg-gray-100/100 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-1"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-[14px] font-medium text-gray-700">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                className="w-full h-[44px] px-4 rounded-md border-none bg-gray-100/100 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-1"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <button
                            disabled={isLoading || !token}
                            className="w-[330px] h-[49px] mx-auto block rounded-xl bg-[#213643] text-white font-medium text-[16px] hover:bg-[#1a2b35] transition-all disabled:opacity-50 mt-3"
                        >
                            {isLoading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
