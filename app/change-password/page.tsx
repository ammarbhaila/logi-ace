"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

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
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: password })
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Password updated successfully!');
                setPassword('');
                setConfirmPassword('');
                setTimeout(() => router.push('/'), 2000);
            } else {
                toast.error(data.error || 'Failed to update password');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-white p-4">
            <div className="w-full max-w-[420px] bg-white border border-gray-300 rounded-3xl shadow-sm p-8 lg:p-10 mt-8">
                <h1 className="text-3xl font-inter text-center text-gray-900 mb-2">Change Password</h1>
                <p className="text-center text-gray-500 mb-8 text-[13px]">Update your current account password</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-[14px] font-medium text-gray-700">New Password</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            className="w-full h-[40px] px-4 rounded-md border-none bg-gray-100/100 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-1"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-[14px] font-medium text-gray-700">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            className="w-full h-[40px] px-4 rounded-md border-none bg-gray-100/100 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mt-1"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <button
                        disabled={isLoading}
                        className="w-full h-[49px] mx-auto block rounded-xl bg-[#213643] text-white font-medium text-[16px] hover:bg-[#1a2b35] transition-all disabled:opacity-50 mt-4"
                    >
                        {isLoading ? "Updating..." : "Update Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}
