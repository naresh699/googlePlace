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

async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,types,vicinity&key=${MAPS_API_KEY}`;
  const response = await axios.get(url);
  return response.data.result;
}

async function generateEmailAndPrompt(business) {
  const { name, website, types, vicinity } = business;
  const hasWebsite = !!website;
  const category = (types && types.length > 0 ? types[0] : 'business').replace(/_/g, ' ');

  const tick = String.fromCharCode(96);
  const tripleTick = tick + tick + tick;

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

    Format the response strictly as a JSON object with keys: "email", "antigravityPrompt", and "description". Do not include markdown formatting like ${tripleTick}json.
  `;

  // --- Try Google Gemini First ---
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Clean the text from potential markdown
      const cleanedText = text.split(tripleTick + 'json').join('').split(tripleTick).join('').trim();
      const parsed = JSON.parse(cleanedText);

      return {
        emailContent: parsed.email,
        antigravityPrompt: parsed.antigravityPrompt,
        hasWebsite,
        description: parsed.description || "Description unavailable.",
      };
    } catch (error) {
      console.error('Gemini error:', error);
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
    emailContent = `Subject: Digital Transformation for ${name}

Dear ${name} Team,

I noticed you don't have a website for your ${category} business in ${vicinity}. We specialize in building high-converting sites.`;
  } else {
    emailContent = `Subject: SEO Optimization for ${name}

Dear ${name} Team,

I visited your website at ${website} and noticed some areas for optimization.`;
  }
  const antigravityPrompt = `Create a website for ${name} (${category}) in ${vicinity}. Sections: Hero, Services, Contact.`;
  return { emailContent, antigravityPrompt, hasWebsite, description };
}

export async function POST(req) {
  try {
    const { placeId } = await req.json();

    if (!placeId) {
      return NextResponse.json({ error: 'Place ID is required.' }, { status: 400 });
    }

    if (!MAPS_API_KEY) {
      return NextResponse.json({ error: 'Maps API Key is missing.' }, { status: 500 });
    }

    const details = await getPlaceDetails(placeId);
    const result = await generateEmailAndPrompt(details);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Summarize API Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
