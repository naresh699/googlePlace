"use client";

import { useState } from "react";
import Link from "next/link";


export default function Register() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [verificationUrl, setVerificationUrl] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");
        setVerificationUrl("");
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    username: formData.username,
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            setSuccessMessage(data.message || "Registration successful! Please check your email to verify your account.");

            if (data.verificationUrl) {
                setVerificationUrl(data.verificationUrl);
            }

            setFormData({ name: "", email: "", username: "", password: "", confirmPassword: "" });
            // Optional: router.push('/login') after a delay
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-900">
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000')`,
                    filter: 'brightness(0.3) saturate(1.2)'
                }}
            />

            {/* Animated Gradient Overlay */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-600/20 via-transparent to-slate-900/40" />

            <div className="relative z-10 w-full max-w-xl px-6 py-12 mt-12 mb-12">
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 p-8 md:p-12 backdrop-blur-sm">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-6 shadow-lg shadow-indigo-200">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
                            Create Your Account
                        </h2>
                        <p className="text-slate-500 font-medium text-lg">
                            Join 2,000+ teams generating local leads
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-pulse">
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}
                        {successMessage && (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-5 py-4 rounded-2xl text-sm font-bold space-y-3">
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    {successMessage}
                                </div>
                                {verificationUrl && (
                                    <div className="mt-4 p-4 bg-white border border-emerald-200 rounded-xl text-xs break-all">
                                        <p className="mb-2 text-emerald-800 uppercase tracking-widest font-black">Development Link:</p>
                                        <a
                                            href={verificationUrl}
                                            className="text-indigo-600 hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {verificationUrl}
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="username" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                                    placeholder="e.g. jdoe77"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2 relative">
                                <label htmlFor="password" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400 pr-12"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 top-6 pr-4 flex items-center text-sm leading-5 z-20"
                                >
                                    {showPassword ? (
                                        <svg className="h-5 w-5 text-slate-400 hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5 text-slate-400 hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            <div className="space-y-2 relative">
                                <label htmlFor="confirmPassword" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Confirm</label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400 pr-12"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 top-6 pr-4 flex items-center text-sm leading-5 z-20"
                                >
                                    {showConfirmPassword ? (
                                        <svg className="h-5 w-5 text-slate-400 hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5 text-slate-400 hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white mt-8 py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98] disabled:bg-indigo-300 disabled:shadow-none flex items-center justify-center gap-3 uppercase tracking-widest"
                        >
                            {loading ? (
                                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Start Growing"
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                        <Link
                            href="/login"
                            className="text-indigo-600 hover:text-indigo-800 font-black tracking-wide uppercase text-sm transition-colors flex items-center justify-center gap-2 mx-auto group"
                        >
                            Already have an account?
                            <span className="underline decoration-2 underline-offset-4 group-hover:text-indigo-900">
                                Login here
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
