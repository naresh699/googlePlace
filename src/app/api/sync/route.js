import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

export async function POST(req) {
  try {
    const { leads } = await req.json();

    if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json({ error: 'Google Sheets configuration is missing.' }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const values = [
      ['Name', 'Phone', 'Website', 'Address', 'Category', 'Status', 'Email Content', 'Antigravity Prompt'],
      ...leads.map((lead) => [
        lead.name,
        lead.phone,
        lead.website || 'N/A',
        lead.address,
        lead.category,
        lead.hasWebsite ? 'Website' : 'No Website',
        lead.email,
        lead.antigravityPrompt,
      ]),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return NextResponse.json({ success: true, message: 'Successfully synced to Google Sheets!' });
  } catch (error) {
    console.error('Sheets Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
