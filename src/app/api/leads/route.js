import { NextResponse } from 'next/server';
import axios from 'axios';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAPS_API_KEY = process.env.MAPS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Google Gemini
let genAI;
if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here' && !GEMINI_API_KEY.includes('your_')) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Initialize OpenAI (Fallback)
let openai;
if (OPENAI_API_KEY && OPENAI_API_KEY !== 'dummy_key_for_build' && !OPENAI_API_KEY.includes('your_')) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

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

async function generateEmailAndPrompt(business) {
  const { name, website, types, vicinity } = business;
  const hasWebsite = !!website;
  const category = (types && types.length > 0 ? types[0] : 'business').replace(/_/g, ' ');

  const prompt = `
    Business Name: ${name}
    Category: ${category}
    Location: ${vicinity}
    Has Website: ${hasWebsite ? 'Yes (' + website + ')' : 'No'}

    1. Draft a professional outreach email. 
       If NO website: Focus on 'Digital Transformation and Building a New Site'.
       If HAS website: Focus on 'Conversion Optimization and SEO'.
    
    2. Generate a highly detailed 'Antigravity Prompt' for an AI website builder. 
       This prompt MUST describe:
       - Business Category: Clearly define ${category}.
       - Local Vibe: Describe a "modern local business with a community-focused, active vibe" for ${vicinity}.
       - Essential Sections: Specify Hero (with strong CTA), Services (listing ${category} offerings), and Contact (with form).
       - Formatting: Use a clear, descriptive tone optimized for an AI that builds websites.
       
    3. Generate a 150-200 word 'description' summarizing the presumed nature of the business, facility, or institution based on its name and category.

    Format the response strictly as a JSON object with keys: "email", "antigravityPrompt", and "description". Do not include markdown formatting like \`\`\`json.
  `;

  // --- Try Google Gemini First ---
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Clean the text from potential markdown
      const cleanedText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      return {
        emailContent: parsed.email,
        antigravityPrompt: parsed.antigravityPrompt,
        hasWebsite,
        description: parsed.description || "Description unavailable.",
      };
    } catch (error) {
      console.error('Gemini error:', error);
      // If Gemini fails, we'll try OpenAI or fallback
    }
  }

  // --- Fallback to OpenAI ---
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        emailContent: result.email,
        antigravityPrompt: result.antigravityPrompt,
        hasWebsite,
        description: result.description || "Description unavailable.",
      };
    } catch (error) {
      console.error('OpenAI error:', error);
    }
  }

  // --- Final Static Fallback ---
  let emailContent = '';
  const description = `${name} is a local ${category} in ${vicinity}. No detailed AI description is currently available.`;
  if (!hasWebsite) {
    emailContent = `Subject: Digital Transformation for ${name}\n\nDear ${name} Team,\n\nI noticed you don't have a website for your ${category} business in ${vicinity}. We specialize in building high-converting sites.`;
  } else {
    emailContent = `Subject: SEO Optimization for ${name}\n\nDear ${name} Team,\n\nI visited your website at ${website} and noticed some areas for optimization.`;
  }
  const antigravityPrompt = `Create a website for ${name} (${category}) in ${vicinity}. Sections: Hero, Services, Contact.`;
  return { emailContent, antigravityPrompt, hasWebsite, description };
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
    const batchSize = 5;

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const enrichedBatch = await Promise.all(
        batch.map(async (lead) => {
          const details = await getPlaceDetails(lead.place_id);
          const { emailContent, antigravityPrompt, hasWebsite, description } = await generateEmailAndPrompt(details);
          const distance = calculateDistance(lat, lng, lead.geometry.location.lat, lead.geometry.location.lng);

          return {
            id: lead.place_id,
            name: details.name || lead.name,
            phone: details.formatted_phone_number || 'N/A',
            website: details.website || null,
            address: details.vicinity || lead.vicinity,
            category: (details.types && details.types[0]) || 'business',
            hasWebsite,
            email: emailContent,
            antigravityPrompt,
            description,
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
