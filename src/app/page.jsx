'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [country, setCountry] = useState('United States');
  const [postalCode, setPostalCode] = useState('');
  const [radius, setRadius] = useState(40); // Initial radius in km
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  const [postalError, setPostalError] = useState('');
  const itemsPerPage = 10;

  const [filter, setFilter] = useState('all');
  const [sortParam, setSortParam] = useState('default');
  const [editingLead, setEditingLead] = useState(null);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);
  const [mapZoom, setMapZoom] = useState(12);
  const [summarizingIds, setSummarizingIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());
  const [hiddenPlaceIds, setHiddenPlaceIds] = useState(new Set());

  const mapApiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || process.env.MAPS_API_KEY || "";

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    if (status === 'authenticated' && !isInitialized) {
      // Try to load saved state from localStorage
      try {
        const savedState = localStorage.getItem('leadGenProState');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          if (parsed.country) setCountry(parsed.country);
          if (parsed.postalCode) setPostalCode(parsed.postalCode);
          if (parsed.radius) setRadius(parsed.radius);
          if (parsed.leads && Array.isArray(parsed.leads)) {
            setLeads(parsed.leads);
          }
          setIsInitialized(true);
          return;
        }
      } catch (err) {
        console.error("Failed to load state from localStorage", err);
      }

      // Auto-detect country based on IP if no saved state
      const fetchCountry = async () => {
        try {
          const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
          const data = await res.json();
          if (data.country && COUNTRIES.includes(data.country)) {
            setCountry(data.country);
          }
        } catch (e) {
          console.error("Failed to detect country", e);
        }
      };
      fetchCountry();
      setIsInitialized(true);
    }
  }, [status, router, isInitialized]);

  useEffect(() => {
    let mounted = true;
    const fetchUserHiddenLeadIds = async () => {
      try {
        const res = await fetch('/api/pipeline/ids');
        if (res.ok && mounted) {
          const data = await res.json();
          setHiddenPlaceIds(new Set(data.placeIds || []));
        }
      } catch (e) {
        console.error("Failed to load hidden leads", e);
      }
    };
    if (status === 'authenticated') {
      fetchUserHiddenLeadIds();
    }
    return () => { mounted = false; };
  }, [status]);



  // Save to localStorage whenever important state changes
  useEffect(() => {
    if (isInitialized && status === 'authenticated') {
      try {
        localStorage.setItem('leadGenProState', JSON.stringify({
          country,
          postalCode,
          radius,
          leads
        }));
      } catch (err) {
        console.error("Failed to save state to localStorage", err);
      }
    }
  }, [country, postalCode, radius, leads, isInitialized, status]);

  const fetchLeads = async (e) => {
    e.preventDefault();
    if (!postalCode.trim() || !radius) return;

    // Postal code validation logic based on country
    const patterns = {
      'United States': /^\d{5}(-\d{4})?$/, // US ZIP code (e.g. 12345 or 12345-6789)
      'United Kingdom': /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, // UK Postcode
      'Canada': /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, // Canadian Postal Code
      'Australia': /^\d{4}$/, // AU Postcode
      'India': /^[1-9][0-9]{5}$/, // Indian PIN code
      'Germany': /^\d{5}$/,
      'France': /^\d{5}$/,
      'Spain': /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/,
      'Italy': /^\d{5}$/,
      'Brazil': /^\d{5}-\d{3}$/
    };

    const pattern = patterns[country];
    if (pattern && !pattern.test(postalCode.trim())) {
      setPostalError(`Please enter a valid postal code for ${country}.`);
      return;
    }
    setPostalError(''); // clear error if valid

    setLoading(true);
    setLeads([]);
    setActiveMarker(null);
    setMapZoom(12);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, postalCode, radius }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setLeads(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async (leadId) => {
    if (summarizingIds.has(leadId)) return;

    setSummarizingIds(prev => new Set(prev).add(leadId));
    try {
      const response = await fetch('/api/leads/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: leadId }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setLeads(prevLeads => prevLeads.map(l =>
        l.id === leadId
          ? { ...l, description: data.description, email: data.emailContent, antigravityPrompt: data.antigravityPrompt }
          : l
      ));

      // If we are currently editing this lead, update the editing state too
      if (editingLead && editingLead.id === leadId) {
        setEditingLead(prev => ({
          ...prev,
          description: data.description,
          email: data.emailContent,
          antigravityPrompt: data.antigravityPrompt
        }));
      }
    } catch (error) {
      alert("Failed to summarize: " + error.message);
    } finally {
      setSummarizingIds(prev => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  };

  const handleSaveLead = async (lead, isSkip = false) => {
    if (savingIds.has(lead.id) || hiddenPlaceIds.has(lead.place_id || lead.id)) return;

    setSavingIds(prev => new Set(prev).add(lead.id));
    try {
      // If we are skipping, we just save the lead with a 'Skip' qualification status
      const payloadLead = { ...lead };
      if (isSkip) {
        payloadLead.qualificationStatus = 'Skip';
      }

      const response = await fetch('/api/leads/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: payloadLead }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update lead');

      // Add to hidden IDs so it disappears from the search results
      setHiddenPlaceIds(prev => new Set(prev).add(lead.place_id || lead.id));
    } catch (error) {
      alert("Failed to process lead: " + error.message);
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
  };

  const syncToSheets = async () => {
    if (leads.length === 0) return;
    setSyncing(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      alert(data.message);
    } catch (error) {
      alert(error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    // Instead of forcing a redirect that gets hijacked by the NEXTAUTH_URL domain,
    // we explicitly tell NextAuth to redirect to the current window's origin + /login.
    await signOut({ callbackUrl: `${window.location.origin}/login` });
  };

  const processedLeads = useMemo(() => {
    let filtered = leads.filter(lead => {
      // Completely hide leads we've already saved or skipped
      if (hiddenPlaceIds.has(lead.place_id || lead.id)) return false;

      if (filter === 'has-website') return lead.hasWebsite;
      if (filter === 'no-website') return !lead.hasWebsite;
      return true;
    });

    if (sortParam === 'distance') {
      filtered = filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return filtered;
  }, [leads, filter, sortParam, hiddenPlaceIds]);

  const totalPages = Math.ceil(processedLeads.length / itemsPerPage);
  const currentLeads = processedLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const mapCenter = useMemo(() => {
    if (activeMarker) return { lat: activeMarker.lat, lng: activeMarker.lng };
    if (processedLeads.length > 0) return { lat: processedLeads[0].lat, lng: processedLeads[0].lng };
    return { lat: 0, lng: 0 };
  }, [processedLeads, activeMarker]);

  const handleEdit = (lead) => {
    setEditingLead(lead);
  };

  const saveEdit = () => {
    if (!editingLead) return;
    setLeads((prev) => prev.map((l) => (l.id === editingLead.id ? editingLead : l)));
    setEditingLead(null);
  };

  if (status === 'loading' || !session) {
    // Return loading state briefly while we check auth or prepare to redirect
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-indigo-500">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-slate-900">
      {/* Top Header */}
      <div className="bg-[#4D3DF7] text-white pt-12 pb-32 px-4 md:px-8 mb-[-4rem]">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white/80">Welcome, {session.user?.name || session.user?.username || 'User'}!</h2>
            <h1 className="text-4xl font-extrabold tracking-tight">Lead Gen Pro</h1>
            <p className="text-white/90 text-lg max-w-lg">Find, analyze, and outreach local businesses instantly. Built for professional growth teams.</p>
          </div>
          <div className="flex items-center gap-4">
            {session.user?.role === 'ADMIN' && (
              <button
                onClick={() => router.push('/admin')}
                className="px-6 py-3 rounded-full font-bold shadow-xl transition-all flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 border border-slate-700"
              >
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Admin
              </button>
            )}
            <button
              onClick={() => router.push('/pipeline')}
              className="px-8 py-3 rounded-full font-bold shadow-xl transition-all flex items-center gap-3 bg-white text-indigo-700 hover:bg-indigo-50 hover:shadow-2xl transform active:scale-95 border-2 border-transparent hover:border-indigo-100"
            >
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              My Pipeline
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 rounded-full font-bold bg-indigo-800 text-white hover:bg-indigo-900 transition-all border border-indigo-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 space-y-8">
        {/* Search Card */}
        <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-indigo-200/50 border border-slate-100 relative z-10">
          <form onSubmit={fetchLeads} className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 space-y-3 w-full">
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Target Country</label>
                <div className="relative">
                  <input
                    list="countries"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-800 font-medium text-lg placeholder:text-slate-400"
                    placeholder="Select a country..."
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  <datalist id="countries">
                    {COUNTRIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Postal/Zip Code</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => {
                      setPostalCode(e.target.value);
                      setPostalError(''); // Clear error when typing
                    }}
                    placeholder="e.g. 10001"
                    className={`w-full bg-slate-50 border ${postalError ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-400'} rounded-xl px-4 py-3 placeholder:text-slate-400 text-slate-800 font-bold outline-none transition-all shadow-sm`}
                  />
                  {postalError && <p className="text-red-500 text-xs font-bold mt-1.5">{postalError}</p>}
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto bg-[#4D3DF7] text-white px-10 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 disabled:bg-indigo-300 h-[60px]"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    Search Leads
                  </>
                )}
              </button>
            </div>

            <div className="w-full md:w-1/2 space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Search Radius</label>
                <span className="text-sm font-bold text-[#4D3DF7] bg-indigo-50 px-3 py-1 rounded-full">{radius} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4D3DF7]"
              />
              <div className="flex justify-between text-xs font-bold text-slate-400 mt-1">
                <span>1 km</span>
                <span>100 km</span>
              </div>
            </div>
          </form>
        </div>

        {/* Results Section */}
        {leads.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start relative z-10">
            {/* List Column (70%) */}
            <div className="lg:col-span-7 bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Active Leads</h2>
                  <p className="text-slate-500 text-sm font-medium">Found {processedLeads.length} matches</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Sort</span>
                    <select
                      value={sortParam}
                      onChange={(e) => { setSortParam(e.target.value); setCurrentPage(1); }}
                      className="text-sm border-none bg-transparent font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer pr-6 py-1.5"
                    >
                      <option value="default">Default</option>
                      <option value="distance">By Distance</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Filter</span>
                    <select
                      value={filter}
                      onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
                      className="text-sm border-none bg-transparent font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer pr-6 py-1.5"
                    >
                      <option value="all">All Results</option>
                      <option value="has-website">Has Website</option>
                      <option value="no-website">No Website</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6 bg-slate-50/30">
                {currentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex flex-col bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all duration-200 group relative"
                  >
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-black text-slate-900 text-xl leading-tight group-hover:text-[#4D3DF7] transition-colors line-clamp-2">{lead.name}</h3>
                          <button
                            onClick={() => {
                              setSelectedLeadForDetails(lead);
                              if (lead.description?.includes('Click "Summarize"')) {
                                handleSummarize(lead.id);
                              }
                            }}
                            className="shrink-0 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="View Details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs font-black text-[#4D3DF7] uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{lead.category.replace(/_/g, ' ')}</span>
                          {lead.distance && <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{lead.distance} km</span>}
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}&query_place_id=${lead.place_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-slate-500 mt-2 line-clamp-2 hover:text-indigo-600 hover:underline transition-colors block"
                        >
                          {lead.address}
                        </a>
                      </div>

                      <div className="flex items-center gap-4 text-sm font-bold text-[#4D3DF7]">
                        <button
                          onClick={() => {
                            setSelectedLeadForDetails(lead);
                            if (lead.description?.includes('Click "Summarize"')) {
                              handleSummarize(lead.id);
                            }
                          }}
                          className="hover:underline hover:text-indigo-700 transition-all flex items-center gap-1"
                        >
                          <span>Details</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveMarker(lead);
                            setMapZoom(16);
                          }}
                          className="hover:underline hover:text-indigo-700 transition-all flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <span>Show in map</span>
                        </button>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between gap-2">
                          {lead.phone ? (
                            <a href={`tel:${lead.phone.replace(/\s+/g, '')}`} className="flex items-center gap-1.5 text-slate-700 hover:text-[#4D3DF7] font-bold text-sm truncate transition-colors">
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              {lead.phone}
                            </a>
                          ) : (
                            <span className="flex items-center gap-1.5 text-slate-400 font-medium text-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              No phone
                            </span>
                          )}
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-black tracking-widest border ${lead.hasWebsite
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}
                          >
                            {lead.hasWebsite ? 'WEBSITE' : 'NO SITE'}
                          </span>
                        </div>

                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 text-[#4D3DF7] hover:text-indigo-800 font-bold text-sm transition-colors bg-indigo-50/50 hover:bg-indigo-100 py-2 rounded-lg border border-transparent hover:border-indigo-100">
                            <span className="truncate max-w-[200px]">{lead.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-50 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveLead(lead, false);
                          }}
                          disabled={savingIds.has(lead.id)}
                          className="flex-1 py-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 border bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                        >
                          {savingIds.has(lead.id) ? (
                            <div className="w-3.5 h-3.5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              Save Lead
                            </>
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveLead(lead, true);
                          }}
                          disabled={savingIds.has(lead.id)}
                          className="flex-1 py-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 border bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                        >
                          {savingIds.has(lead.id) ? (
                            <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Skip
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedLeadForDetails(lead);
                          handleEdit(lead);
                          if (lead.description?.includes('Click "Summarize"')) {
                            handleSummarize(lead.id);
                          }
                        }}
                        className="w-full bg-[#4D3DF7] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        Review / Outreach
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-all"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Map Column (30%) */}
            <div className="lg:col-span-3 sticky top-8">
              <div className="w-full h-[600px] bg-slate-100 rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                {mapApiKey ? (
                  <APIProvider apiKey={mapApiKey}>
                    <Map
                      style={{ width: '100%', height: '100%' }}
                      defaultCenter={mapCenter}
                      defaultZoom={mapZoom}
                      center={mapCenter}
                      zoom={mapZoom}
                      mapId="DEMO_MAP_ID"
                      disableDefaultUI={false}
                      zoomControl={true}
                      styles={[
                        {
                          featureType: "poi",
                          elementType: "labels",
                          stylers: [{ visibility: "off" }]
                        }
                      ]}
                    >
                      {currentLeads.map((lead) => (
                        <AdvancedMarker
                          key={lead.id}
                          position={{ lat: lead.lat, lng: lead.lng }}
                        />
                      ))}
                    </Map>
                  </APIProvider>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-bold gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    Loading Map...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Business Details Slide-over */}
        <div
          className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[150] transform transition-transform duration-300 ease-in-out border-l border-slate-200 ${selectedLeadForDetails ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {selectedLeadForDetails && (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Business Profile</h3>
                <button
                  onClick={() => {
                    setSelectedLeadForDetails(null);
                    setEditingLead(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-colors bg-white rounded-xl shadow-sm border border-slate-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedLeadForDetails.name}</h2>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-black text-[#4D3DF7] text-xs uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                      {selectedLeadForDetails.category.replace(/_/g, ' ')}
                    </span>
                    {selectedLeadForDetails.hasWebsite ? (
                      <span className="bg-emerald-50 text-emerald-700 text-xs font-black tracking-widest px-3 py-1.5 rounded-lg border border-emerald-100 uppercase">Website Active</span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 text-xs font-black tracking-widest px-3 py-1.5 rounded-lg border border-amber-100 uppercase">No Website</span>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Details</label>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-2 bg-slate-50 rounded-lg text-slate-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <p className="text-slate-700 font-medium text-sm leading-relaxed">{selectedLeadForDetails.address}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </div>
                        {selectedLeadForDetails.phone ? (
                          <a href={`tel:${selectedLeadForDetails.phone.replace(/\s+/g, '')}`} className="text-[#4D3DF7] font-bold text-sm hover:underline">
                            {selectedLeadForDetails.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400 font-medium text-sm">No phone</span>
                        )}
                      </div>
                      {selectedLeadForDetails.website && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" /></svg>
                          </div>
                          <a href={selectedLeadForDetails.website} target="_blank" rel="noreferrer" className="text-[#4D3DF7] font-bold text-sm hover:underline truncate">
                            {selectedLeadForDetails.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Business Analysis</label>
                    <div className="mt-4 relative bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <p className={`text-slate-600 text-sm leading-relaxed italic ${summarizingIds.has(selectedLeadForDetails.id) ? 'animate-pulse blur-[1px]' : ''}`}>
                        {selectedLeadForDetails.description}
                      </p>
                      {selectedLeadForDetails.description.includes('Click "Summarize"') && !summarizingIds.has(selectedLeadForDetails.id) && (
                        <button
                          onClick={() => handleSummarize(selectedLeadForDetails.id)}
                          className="mt-4 w-full bg-[#4D3DF7] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Generate AI Summary
                        </button>
                      )}
                      {summarizingIds.has(selectedLeadForDetails.id) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-2xl">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-bold text-indigo-600">Analyzing...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions / Editing State */}
              <div className="p-8 border-t border-slate-100 space-y-3">
                {editingLead && editingLead.id === selectedLeadForDetails.id ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div>
                      <h4 className="text-lg font-black text-slate-900">Refine Outreach</h4>
                      <p className="text-xs text-slate-500 mt-1">Review and modify the generated content</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Draft</label>
                        <div className="relative">
                          <textarea
                            value={editingLead.email}
                            onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                            placeholder={summarizingIds.has(editingLead.id) ? "Generating personalized email..." : "Write your email here..."}
                            className={`w-full h-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-700 text-sm leading-relaxed ${summarizingIds.has(editingLead.id) ? 'opacity-50' : ''}`}
                          />
                          {summarizingIds.has(editingLead.id) && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Antigravity AI Prompt</label>
                        <div className="relative">
                          <textarea
                            value={editingLead.antigravityPrompt}
                            onChange={(e) => setEditingLead({ ...editingLead, antigravityPrompt: e.target.value })}
                            placeholder={summarizingIds.has(editingLead.id) ? "Generating AI prompt..." : "Write your prompt here..."}
                            className={`w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-600 font-mono text-xs leading-relaxed ${summarizingIds.has(editingLead.id) ? 'opacity-50' : ''}`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setEditingLead(null)}
                        className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        className="flex-1 py-3 text-sm font-bold bg-[#4D3DF7] text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                      >
                        Save Details
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        handleEdit(selectedLeadForDetails);
                        if (selectedLeadForDetails.description.includes('Click "Summarize"')) {
                          handleSummarize(selectedLeadForDetails.id);
                        }
                      }}
                      className="w-full bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#4D3DF7] transition-all shadow-xl active:scale-95"
                    >
                      Start Outreach
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personalize with AI before sending</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Backdrop for Slide-over */}
        {selectedLeadForDetails && (
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[140] transition-opacity duration-300"
            onClick={() => {
              setSelectedLeadForDetails(null);
              setEditingLead(null);
            }}
          />
        )}
      </div>
    </div >
  );
}
