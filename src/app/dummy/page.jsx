'use client';

import React, { useState } from 'react';

const DUMMY_DATA = [
  {
    id: '1',
    name: 'Gourmet Gardens Bistro',
    phone: '(555) 123-4567',
    website: 'https://gourmet-gardens.com',
    address: '123 Culinary Way, San Francisco, CA',
    category: 'Restaurant',
    hasWebsite: true,
  },
  {
    id: '2',
    name: 'Ace Hardware',
    phone: '(555) 987-6543',
    website: null,
    address: '456 Hammer St, San Francisco, CA',
    category: 'Hardware Store',
    hasWebsite: false,
  }
];

export default function DummyPage() {
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');

  const filteredLeads = DUMMY_DATA.filter(lead => {
    if (filter === 'has-website') return lead.hasWebsite;
    if (filter === 'no-website') return !lead.hasWebsite;
    return true;
  });

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Lead Gen Pro (Dummy Preview)</h1>
            <p style={{ color: '#666', margin: 0 }}>This is a preview of the Lead Generation dashboard.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Filter Status:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Leads</option>
              <option value="has-website">Has Website</option>
              <option value="no-website">No Website</option>
            </select>
          </div>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '12px' }}>Business</th>
              <th style={{ padding: '12px' }}>Contact</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => (
              <tr key={lead.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 'bold' }}>{lead.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{lead.category}</div>
                </td>
                <td style={{ padding: '12px' }}>
                  <div>{lead.phone}</div>
                  {lead.website && <div style={{ fontSize: '12px', color: 'blue' }}>{lead.website}</div>}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '999px', 
                    fontSize: '11px', 
                    backgroundColor: lead.hasWebsite ? '#ecfdf5' : '#fffbeb',
                    color: lead.hasWebsite ? '#047857' : '#b45309'
                  }}>
                    {lead.hasWebsite ? 'HAS WEBSITE' : 'NO WEBSITE'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <button 
                    onClick={() => setEditing(lead)}
                    style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', maxWidth: '500px', width: '100%', margin: 'auto' }}>
            <h2>Editing {editing.name}</h2>
            <p>This is where you would edit the AI-generated email and prompts.</p>
            <button onClick={() => setEditing(null)} style={{ padding: '10px 20px', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
