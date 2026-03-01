'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function PipelinePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    // Slide-over Filter Tabs (Consider vs Skip)
    const [activeTab, setActiveTab] = useState('Consider');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }

        if (status === 'authenticated') {
            fetchPipeline();
        }
    }, [status, router]);

    const fetchPipeline = async () => {
        try {
            const res = await fetch('/api/pipeline');
            const data = await res.json();
            if (res.ok) {
                setLeads(data.leads || []);
            }
        } catch (error) {
            console.error('Failed to fetch pipeline:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateLead = async (id, updates) => {
        setUpdatingId(id);

        // Add timestamps automatically based on status changes if they aren't already set
        const currentLead = leads.find(l => l.id === id);
        const timeNow = new Date().toISOString();

        if (updates.communicationStatus && updates.communicationStatus !== currentLead.communicationStatus) {
            if (updates.communicationStatus.includes('Phone')) updates.calledAt = timeNow;
            if (updates.communicationStatus.includes('Meeting')) updates.metAt = timeNow;
        }
        if (updates.leadOutcome === 'Yes' && currentLead.leadOutcome !== 'Yes') {
            updates.leadGeneratedAt = timeNow;
            updates.workStartedAt = timeNow; // Can be separated later
        }

        try {
            const res = await fetch('/api/pipeline', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, updates })
            });

            const data = await res.json();
            if (res.ok && data.lead) {
                setLeads(prev => prev.map(l => l.id === id ? data.lead : l));
                if (selectedLead?.id === id) {
                    setSelectedLead(data.lead);
                }
            }
        } catch (error) {
            console.error('Failed to update lead:', error);
        } finally {
            setUpdatingId(null);
        }
    };

    const calculatePrice = (score) => {
        if (score === 0) return 'Not Assessed';
        if (score <= 3) return '₹15,000 (Simple Static)';
        if (score <= 7) return '₹20,000 (Medium Complex)';
        return '₹25,000+ (Highly Complex)';
    };

    // Filter leads based on active tab
    const filteredLeads = leads.filter(l => l.qualificationStatus === activeTab);

    if (loading || status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Loading Pipeline...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">

            {/* Motivational Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-[#4D3DF7] opacity-[0.03] pointer-events-none" />
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex justify-between items-end relative z-10">
                        <div>
                            <button onClick={() => router.push('/')} className="text-sm font-bold text-slate-400 hover:text-indigo-600 mb-4 flex items-center gap-1 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to Search
                            </button>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                                My Pipeline
                                <span className="bg-indigo-100 text-indigo-700 text-sm py-1 px-3 rounded-full border border-indigo-200 shadow-sm">
                                    {leads.length} Saved
                                </span>
                            </h1>
                            <p className="mt-2 text-slate-500 font-medium">Turn these opportunities into successful projects.</p>
                        </div>

                        {/* Quick Stats */}
                        <div className="hidden md:flex gap-4">
                            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm min-w-[120px] text-center">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Active</p>
                                <p className="text-2xl font-black text-emerald-600">{leads.filter(l => l.qualificationStatus === 'Consider').length}</p>
                            </div>
                            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm min-w-[120px] text-center">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Won</p>
                                <p className="text-2xl font-black text-[#4D3DF7]">{leads.filter(l => l.leadOutcome === 'Yes').length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Tabs */}
                    <div className="flex items-center gap-2 mt-8">
                        <button
                            onClick={() => setActiveTab('Consider')}
                            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${activeTab === 'Consider'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            Active Deals ({leads.filter(l => l.qualificationStatus === 'Consider').length})
                        </button>
                        <button
                            onClick={() => setActiveTab('Skip')}
                            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${activeTab === 'Skip'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            Skipped / Archived ({leads.filter(l => l.qualificationStatus === 'Skip').length})
                        </button>
                    </div>
                </div>
            </header>

            {/* Grid of Leads */}
            <main className="max-w-7xl mx-auto p-6">
                {filteredLeads.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Your pipeline is empty</h3>
                        <p className="text-slate-500 mt-2 font-medium">Head back to the search page and save some promising businesses.</p>
                        <button
                            onClick={() => router.push('/')}
                            className="mt-8 px-8 py-3 bg-[#4D3DF7] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
                        >
                            Find New Leads
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredLeads.map(lead => (
                            <div
                                key={lead.id}
                                onClick={() => setSelectedLead(lead)}
                                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col relative overflow-hidden"
                            >
                                {/* Decorative outcome stripe */}
                                {lead.leadOutcome === 'Yes' && <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-500" />}
                                {lead.leadOutcome === 'No' && <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-400 to-red-500" />}

                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[10px] font-black text-[#4D3DF7] uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded inline-block border border-indigo-100">
                                            {lead.category?.replace(/_/g, ' ') || 'Local Business'}
                                        </span>
                                        {lead.leadOutcome === 'Yes' && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">WON</span>}
                                    </div>

                                    <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{lead.name}</h3>
                                    <p className="text-xs text-slate-500 mt-2 line-clamp-1">{lead.address}</p>
                                </div>

                                <div className="mt-5 space-y-3 pt-4 border-t border-slate-50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400">Communication</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${lead.communicationStatus === 'Pending' ? 'bg-red-50 text-red-600 border border-red-100' :
                                            lead.communicationStatus === 'Email Sent' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                            }`}>
                                            {lead.communicationStatus}
                                        </span>
                                    </div>
                                    {lead.complexityScore > 0 && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400">Est. Value</span>
                                            <span className="text-xs font-black text-slate-800">{calculatePrice(lead.complexityScore).split(' ')[0]}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Detailed Slide-over Panel */}
            <div
                className={`fixed inset-y-0 right-0 w-full max-w-[40%] bg-white shadow-2xl z-[150] transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${selectedLead ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {selectedLead && (
                    <>
                        {/* Panel Header */}
                        <div className="flex-shrink-0 px-8 py-6 border-b border-slate-100 bg-white sticky top-0 z-20">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-[#4D3DF7] uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">CRM Dashboard</span>
                                <button
                                    onClick={() => setSelectedLead(null)}
                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedLead.name}</h2>
                            <div className="flex items-center gap-4 mt-3 text-sm font-bold text-slate-500">
                                {selectedLead.phone && <a href={`tel:${selectedLead.phone}`} className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{selectedLead.phone}</a>}
                                {selectedLead.website && <a href={selectedLead.website} target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>Visit Site</a>}
                            </div>
                        </div>

                        {/* Panel Content (Scrollable) */}
                        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-12 relative">

                            {/* Loading overlay for updates */}
                            {updatingId === selectedLead.id && (
                                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                </div>
                            )}

                            {/* A. Qualification Status */}
                            <section className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400" /> Lead Qualification</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Should we pursue this project?</p>
                                </div>
                                <div className="flex bg-slate-100 p-1.5 rounded-2xl relative">
                                    <div
                                        className={`absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm border border-slate-200 transition-transform duration-300 ease-in-out ${selectedLead.qualificationStatus === 'Skip' ? 'translate-x-full' : 'translate-x-0'
                                            }`}
                                    />
                                    <button
                                        onClick={() => updateLead(selectedLead.id, { qualificationStatus: 'Consider' })}
                                        className={`flex-1 relative z-10 py-3 text-sm font-bold rounded-xl transition-colors ${selectedLead.qualificationStatus === 'Consider' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Consider Match
                                    </button>
                                    <button
                                        onClick={() => updateLead(selectedLead.id, { qualificationStatus: 'Skip' })}
                                        className={`flex-1 relative z-10 py-3 text-sm font-bold rounded-xl transition-colors ${selectedLead.qualificationStatus === 'Skip' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Skip For Now
                                    </button>
                                </div>
                            </section>

                            {/* B. Communication Status */}
                            <section className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400" /> Communication</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Track your outreach efforts.</p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { label: 'Pending', color: 'red' },
                                        { label: 'Email Sent', color: 'blue' },
                                        { label: 'Phone Call Done', color: 'emerald' },
                                        { label: 'In-Person Meeting', color: 'indigo' }
                                    ].map(status => {
                                        const isActive = selectedLead.communicationStatus === status.label;
                                        return (
                                            <button
                                                key={status.label}
                                                onClick={() => updateLead(selectedLead.id, { communicationStatus: status.label })}
                                                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border-2 ${isActive
                                                    ? `bg-${status.color}-500 border-${status.color}-500 text-white shadow-md transform scale-105`
                                                    : `bg-white border-slate-200 text-slate-500 hover:border-${status.color}-300 hover:bg-${status.color}-50 hover:text-${status.color}-700`
                                                    }`}
                                            >
                                                {status.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* C. Interactive Complexity & Pricing Estimator */}
                            <section className="space-y-6 bg-slate-50 border border-slate-200 p-6 rounded-3xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-60" />
                                <div className="relative z-10">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#4D3DF7]" /> Project Estimator</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Estimate the project complexity to automatically generate quotes.</p>
                                </div>

                                <div className="space-y-8 relative z-10 pt-4">
                                    <div>
                                        <div className="flex justify-between items-end mb-4">
                                            <span className="text-3xl font-black text-[#4D3DF7] tracking-tight">{selectedLead.complexityScore}<span className="text-lg text-indigo-300">/10</span></span>
                                            <div className="text-right">
                                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Value</span>
                                                <span className="text-xl font-black text-slate-800 bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-sm inline-block">
                                                    {calculatePrice(selectedLead.complexityScore)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="relative pb-6 pt-2">
                                            <input
                                                type="range"
                                                min="0" max="10"
                                                value={selectedLead.complexityScore}
                                                onChange={(e) => updateLead(selectedLead.id, {
                                                    complexityScore: parseInt(e.target.value),
                                                    pricingEstimate: calculatePrice(parseInt(e.target.value))
                                                })}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4D3DF7]"
                                            />
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-3 absolute w-full">
                                                <span>0 (None)</span>
                                                <span>3 (Static)</span>
                                                <span>7 (Medium)</span>
                                                <span>10 (Complex)</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Notes / Requirements</label>
                                        <textarea
                                            value={selectedLead.notes || ''}
                                            onChange={(e) => updateLead(selectedLead.id, { notes: e.target.value })}
                                            placeholder="e.g. They need a custom e-commerce flow with 3 animated pages..."
                                            className="w-full h-24 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-slate-700 text-sm font-medium leading-relaxed resize-none shadow-sm"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* D. Lead Outcome */}
                            <section className="space-y-4 pt-4 border-t border-slate-100">
                                <div>
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /> Final Outcome</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Did we win the deal?</p>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'In Progress', val: 'In Progress', icon: '⏳' },
                                        { label: 'Won Deal', val: 'Yes', icon: '🎉' },
                                        { label: 'Lost Deal', val: 'No', icon: '❌' }
                                    ].map(outcome => (
                                        <button
                                            key={outcome.val}
                                            onClick={() => updateLead(selectedLead.id, { leadOutcome: outcome.val })}
                                            className={`py-4 px-2 rounded-2xl flex flex-col items-center gap-2 transition-all border-2 ${selectedLead.leadOutcome === outcome.val
                                                ? 'bg-slate-900 border-slate-900 text-white shadow-xl transform scale-105 z-10'
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span className="text-2xl">{outcome.icon}</span>
                                            <span className="text-xs font-black uppercase tracking-wider">{outcome.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Timestamp History Box */}
                            <section className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-mono text-slate-400 space-y-1">
                                <p>Saved: {new Date(selectedLead.createdAt).toLocaleString()}</p>
                                {selectedLead.calledAt && <p className="text-indigo-400">Call Logged: {new Date(selectedLead.calledAt).toLocaleString()}</p>}
                                {selectedLead.metAt && <p className="text-indigo-400">Meeting Logged: {new Date(selectedLead.metAt).toLocaleString()}</p>}
                                {selectedLead.leadGeneratedAt && <p className="text-emerald-500">Deal Closed: {new Date(selectedLead.leadGeneratedAt).toLocaleString()}</p>}
                            </section>

                        </div>
                    </>
                )}
            </div>

            {/* Backdrop for Slide-over */}
            {selectedLead && (
                <div
                    className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[140] transition-opacity duration-300"
                    onClick={() => setSelectedLead(null)}
                />
            )}
        </div>
    );
}
