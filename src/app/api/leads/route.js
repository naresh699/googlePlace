import { NextResponse } from 'next/server';
import axios from 'axios';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAPS_API_KEY = process.env.MAPS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Haversine distance formula (returns distance in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

async function geocode(country, postalCode) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    `${postalCode}, ${country}`
  )}&key=${MAPS_API_KEY}`;
  const response = await axios.get(url);
  if (response.data.results.length === 0) {
    throw new Error('Geocoding failed: No results found.');
  }
  return response.data.results[0].geometry.location;
}

async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,types,vicinity&key=${MAPS_API_KEY}`;
  const response = await axios.get(url);
  return response.data.result;
}

export async function POST(req) {
  try {
    const { country, postalCode, radius = 40 } = await req.json();

    if (!MAPS_API_KEY) {
      return NextResponse.json({ error: 'Maps API Key is missing.' }, { status: 500 });
    }

    const { lat, lng } = await geocode(country, postalCode);

    let leads = [];
    let nextPageToken = null;
    const maxResults = 100;
    const radiusMeters = radius * 1000;

    do {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&key=${MAPS_API_KEY}${nextPageToken ? `&pagetoken=${nextPageToken}` : ''
        }`;

      const response = await axios.get(url);
      const results = response.data.results;
      leads = [...leads, ...results];
      nextPageToken = response.data.next_page_token;

      if (leads.length >= maxResults) break;

      if (nextPageToken) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } while (nextPageToken && leads.length < maxResults);

    leads = leads.slice(0, maxResults);

    const enrichedLeads = [];
    const batchSize = 10; // Can be larger now since we aren't calling AI

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const enrichedBatch = await Promise.all(
        batch.map(async (lead) => {
          const details = await getPlaceDetails(lead.place_id);
          const hasWebsite = !!details.website;
          const distance = calculateDistance(lat, lng, lead.geometry.location.lat, lead.geometry.location.lng);
          const category = (details.types && details.types[0]) || 'business';

          return {
            id: lead.place_id,
            name: details.name || lead.name,
            phone: details.formatted_phone_number || 'N/A',
            website: details.website || null,
            address: details.vicinity || lead.vicinity,
            category,
            hasWebsite,
            email: '', // Placeholder, will be generated on-demand
            antigravityPrompt: '', // Placeholder, will be generated on-demand
            description: 'Click "Summarize" to generate a detailed AI description.',
            lat: lead.geometry.location.lat,
            lng: lead.geometry.location.lng,
            distance
          };
        })
      );
      enrichedLeads.push(...enrichedBatch);
    }

    return NextResponse.json(enrichedLeads);
  } catch (error) {
    console.error('API Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
