"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TITLES = ["Sales Executive", "Sales Manager", "Program Manager", "Other"];

const US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "District Of Columbia", "Florida", "Georgia",
    "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
    "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
    "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

const SHI_SEGMENTS = [
    "Commercial Inside Sales",
    "Enterprise Field Sales",
    "Enterprise Inside Sales (Austin)",
    "Federal",
    "Global Sales",
    "Healthcare",
    "International",
    "Public Sector Field",
    "Public Sector Inside",
    "SMB",
    "Strategic Sales",
];

export default function AccountPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        title: "",
        city: "",
        state: "",
        shi_segment: "",
    });

    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((data) => {
                if (data.error) { router.push("/login"); return; }
                setForm({
                    first_name: data.first_name ?? "",
                    last_name: data.last_name ?? "",
                    username: data.username ?? "",
                    email: data.email ?? "",
                    title: data.title ?? "",
                    city: data.city ?? "",
                    state: data.state ?? "",
                    shi_segment: data.shi_segment ?? "",
                });
            })
            .finally(() => setLoading(false));
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/auth/update-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: form.first_name,
                    last_name: form.last_name,
                    username: form.username,
                    title: form.title,
                    city: form.city,
                    state: form.state,
                    shi_segment: form.shi_segment,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save.");
            setMessage({ type: "success", text: "Profile updated successfully!" });
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err: any) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-8 h-8 border-4 border-[#112F45] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
            <div className="max-w-5xl mx-auto py-5">
                <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">

                    {/* GREY HEADER BANNER */}
                    {/* <div className="bg-[#E5E7EB] py-4 flex items-center justify-center border-b border-gray-300">
                        <h1 className="text-3xl font-semibold text-[#112F45] tracking-tight">Profile Settings</h1>
                    </div> */}

                    {/* Message */}
                    {message && (
                        <div className={`mx-10 mt-8 p-4 rounded-xl border ${message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"} shadow-sm animate-in fade-in slide-in-from-top-4 duration-300`}>
                            <div className="flex items-center gap-3">
                                {message.type === "success" ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                )}
                                <p className="font-bold">{message.text}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="px-12 py-12 space-y-8">

                        {/* Account Info section */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-medium text-[#112F45] border-b pb-2">Account Info</h2>
                            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 space-y-6">

                                {/* Email (read-only) */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        readOnly
                                        className="w-full h-8 px-3 rounded-md border border-gray-200 bg-gray-100 text-gray-500 text-sm outline-none cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-400">Email cannot be changed. Contact support if needed.</p>
                                </div>

                                {/* Username */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Username</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={form.username}
                                        onChange={handleChange}
                                        className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                    />
                                </div>

                            </div>
                        </div>

                        {/* Personal Details section */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-medium text-[#112F45] border-b pb-2">Personal Details</h2>
                            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 space-y-6">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">First Name</label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={form.first_name}
                                            onChange={handleChange}
                                            className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Last Name</label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={form.last_name}
                                            onChange={handleChange}
                                            className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Title</label>
                                        <select
                                            name="title"
                                            value={form.title}
                                            onChange={handleChange}
                                            className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                        >
                                            <option value="">Select title...</option>
                                            {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">SHI Segment</label>
                                        <select
                                            name="shi_segment"
                                            value={form.shi_segment}
                                            onChange={handleChange}
                                            className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                        >
                                            <option value="">Select segment...</option>
                                            {SHI_SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">City</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={form.city}
                                            onChange={handleChange}
                                            className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">State</label>
                                        <select
                                            name="state"
                                            value={form.state}
                                            onChange={handleChange}
                                            className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                        >
                                            <option value="">Select state...</option>
                                            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Location section */}





                        {/* SUBMIT BUTTON */}
                        <div className="pt-8 flex justify-center border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-[170px] h-[45px] bg-[#c65d2f] hover:bg-[#A84520] text-white text-sm font-medium font-inter tracking-wider rounded-[2px] transition-all disabled:opacity-50 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {saving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : "Save Changes"}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
