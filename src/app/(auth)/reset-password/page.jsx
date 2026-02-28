"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Token is missing. Check your link.");
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage(data.message);
                setTimeout(() => router.push("/login"), 3000);
            } else {
                setError(data.message || "An error occurred");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative z-10 w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-slate-900">New Password</h2>
                <p className="text-slate-500 font-medium">Create your new password</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
                {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold">{error}</div>}
                {message && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold">{message}</div>}

                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-semibold text-slate-900"
                        placeholder="••••••••"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                    <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-semibold text-slate-900"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50"
                >
                    {loading ? "Resetting..." : "Reset Password"}
                </button>
            </form>

            <div className="mt-8 text-center">
                <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-black tracking-wide uppercase text-sm">
                    Back to Login
                </Link>
            </div>
        </div>
    );
}

export default function ResetPassword() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 relative">
            <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000')`, filter: 'brightness(0.2)' }} />
            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <ResetPasswordContent />
            </Suspense>
        </div>
    );
}
