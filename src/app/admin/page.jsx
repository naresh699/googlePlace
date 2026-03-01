'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated') {
            if (session?.user?.role !== 'ADMIN') {
                router.push('/'); // Redirect non-admins
                return;
            }
            fetchUsers();
        }
    }, [status, session, router]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUserStatus = async (userId, newStatus) => {
        // Optimistic UI update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, status: newStatus })
            });
            if (!res.ok) throw new Error('Update failed');
        } catch (error) {
            console.error(error);
            alert("Failed to update user status.");
            // Revert on failure
            fetchUsers();
        }
    };

    if (loading || status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
                <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="text-indigo-400">🛡️</span> Security Admin
                        </h1>
                        <p className="mt-1 text-slate-400 text-sm font-medium">Manage user registrations & access</p>
                    </div>
                    <button onClick={() => router.push('/')} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
                        Exit Dashboard
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 mt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800">All Registered Users ({users.length})</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-6 py-4 border-b border-slate-100">User Details</th>
                                    <th className="px-6 py-4 border-b border-slate-100">Role</th>
                                    <th className="px-6 py-4 border-b border-slate-100">Email Verified</th>
                                    <th className="px-6 py-4 border-b border-slate-100">Access Status</th>
                                    <th className="px-6 py-4 border-b border-slate-100 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{user.name}</div>
                                            <div className="text-xs text-slate-500">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.emailVerified ? (
                                                <span className="text-emerald-500 font-bold flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> Yes</span>
                                            ) : (
                                                <span className="text-amber-500 font-bold flex items-center gap-1.5"><div className="w-2 h-2 bg-amber-500 rounded-full" /> Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    user.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                            {user.status !== 'APPROVED' && (
                                                <button
                                                    onClick={() => handleUpdateUserStatus(user.id, 'APPROVED')}
                                                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                            {user.status !== 'REJECTED' && user.role !== 'ADMIN' && (
                                                <button
                                                    onClick={() => handleUpdateUserStatus(user.id, 'REJECTED')}
                                                    className="px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 text-xs font-bold rounded transition"
                                                >
                                                    Reject
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-medium">
                                            No users found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
