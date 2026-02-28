# Lead Generation Web Application

A professional Lead Generation tool that finds businesses via Google Places, analyzes their digital presence, and drafts tailored outreach.

## Features

- **Search**: UI for 'Country' and 'Postal Code' to find local businesses.
- **Google Places Integration**: Geocodes inputs and retrieves 100 leads using `nearbysearch`.
- **Lead Enrichment**: Fetches phone numbers and website URLs for each lead.
- **Agentic Logic**: Drafts targeted emails and "Antigravity Prompts" for LLM website builders.
- **Interactive UI**: Paginated table with status badges and "Human-in-the-Loop" editing.
- **Google Sheets Sync**: One-click export to a Google Sheet.

## Getting Started

1.  Clone the repository.
2.  Install dependencies: `npm install`.
3.  Set up environment variables in `.env.local` (see `.env.example`).
4.  Run the development server: `npm run dev`.

## Tech Stack

- **Next.js**: Full-stack React framework.
- **Tailwind CSS**: Modern styling.
- **Google Maps API**: Geocoding and Places services.
- **Google Sheets API**: Data export.
- **OpenAI API**: Intelligent email and prompt generation.
