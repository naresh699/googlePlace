'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

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
  const itemsPerPage = 10;

  const [filter, setFilter] = useState('all');
  const [sortParam, setSortParam] = useState('default');
  const [editingLead, setEditingLead] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_MAPS_API_KEY || process.env.MAPS_API_KEY || "",
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    // Auto-detect country based on IP
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
  }, [status, router]);

  const fetchLeads = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLeads([]);
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
    await signOut({ callbackUrl: '/login' });
  };

  const processedLeads = useMemo(() => {
    let filtered = leads.filter(lead => {
      if (filter === 'has-website') return lead.hasWebsite;
      if (filter === 'no-website') return !lead.hasWebsite;
      return true;
    });

    if (sortParam === 'distance') {
      filtered = filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return filtered;
  }, [leads, filter, sortParam]);

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
            <button
              onClick={syncToSheets}
              disabled={leads.length === 0 || syncing}
              className={`px-8 py-3 rounded-full font-bold shadow-xl transition-all flex items-center gap-3 transform active:scale-95 ${leads.length === 0 || syncing
                ? 'bg-white/10 text-white/50 cursor-not-allowed border border-white/20'
                : 'bg-white text-indigo-700 hover:bg-indigo-50 hover:shadow-2xl'
                }`}
            >
              {syncing ? (
                <>
                  <div className="w-5 h-5 border-3 border-indigo-200 border-t-indigo-700 rounded-full animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Sync to Sheets
                </>
              )}
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
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-800 font-medium text-lg placeholder:text-slate-400"
                  placeholder="e.g. 90210"
                  required
                />
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

              <div className="divide-y divide-slate-100">
                {currentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-8 hover:bg-indigo-50/30 transition-all duration-200"
                    onMouseEnter={() => setActiveMarker(lead)}
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="font-black text-slate-900 text-xl group-hover:text-[#4D3DF7] transition-colors">{lead.name}</h3>
                          <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
                            <span className="font-black text-[#4D3DF7] uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-md">{lead.category.replace(/_/g, ' ')}</span>
                            {lead.distance && <span className="font-semibold text-slate-600 border border-slate-200 rounded-md px-3 py-1">{lead.distance} km away</span>}
                            <span className="text-slate-500 font-medium">{lead.address}</span>
                          </div>
                        </div>

                        <p className="text-slate-600 text-sm leading-relaxed border-l-4 border-indigo-100 pl-4 py-1 italic shadow-sm">
                          {lead.description}
                        </p>

                        <div className="flex items-center gap-6 mt-4 flex-wrap text-sm">
                          <div className="flex items-center gap-2 text-slate-700 font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            {lead.phone}
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black tracking-widest border-2 ${lead.hasWebsite
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${lead.hasWebsite ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {lead.hasWebsite ? 'WEBSITE ACTIVE' : 'NO WEBSITE'}
                            </span>

                            {lead.website && (
                              <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold transition-colors bg-indigo-50/50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg">
                                <span className="truncate max-w-[180px]">{lead.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <button
                          onClick={() => handleEdit(lead)}
                          className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#4D3DF7] transition-all shadow-lg active:scale-95 w-full md:w-auto"
                        >
                          Outreach
                        </button>
                      </div>
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
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={mapCenter}
                    zoom={12}
                    options={{
                      disableDefaultUI: false,
                      zoomControl: true,
                      styles: [
                        {
                          featureType: "poi",
                          elementType: "labels",
                          stylers: [{ visibility: "off" }]
                        }
                      ]
                    }}
                  >
                    {currentLeads.map((lead) => (
                      <Marker
                        key={lead.id}
                        position={{ lat: lead.lat, lng: lead.lng }}
                        animation={activeMarker?.id === lead.id ? 1 : null} // 1 = BOUNCE in google maps api
                      />
                    ))}
                  </GoogleMap>
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

        {/* Edit Modal */}
        {editingLead && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
              <div className="p-10 space-y-8 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Refine Outreach</h3>
                    <p className="text-slate-500 font-medium mt-1">Personalizing message for <span className="text-indigo-600 font-bold">{editingLead.name}</span></p>
                  </div>
                  <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-slate-900 p-2 transition-colors">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Email Outreach Draft</label>
                    <textarea
                      value={editingLead.email}
                      onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                      className="w-full h-48 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-700 leading-relaxed font-medium"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Antigravity AI Builder Prompt</label>
                    <textarea
                      value={editingLead.antigravityPrompt}
                      onChange={(e) => setEditingLead({ ...editingLead, antigravityPrompt: e.target.value })}
                      className="w-full h-32 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-600 font-mono text-xs leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    onClick={() => setEditingLead(null)}
                    className="px-8 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={saveEdit}
                    className="px-8 py-3 text-sm font-bold bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                  >
                    Save Modifications
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
