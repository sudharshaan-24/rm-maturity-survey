import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const client = searchParams.get('client');

  if (!client) {
    return NextResponse.json({ error: 'client is required' }, { status: 400 });
  }

  // Look up the client's ID from their name
  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('name', client)
    .single();

  if (clientError || !clientRow) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Get all survey_master rows for this client
  const { data: surveys, error: surveyError } = await supabase
    .from('survey_master')
    .select('month, status')
    .eq('client_id', clientRow.id);

  if (surveyError) {
    return NextResponse.json({ error: surveyError.message }, { status: 500 });
  }

  const statusMap: Record<string, string> = {};
  surveys?.forEach((row) => {
    statusMap[row.month.trim().toLowerCase()] = row.status;
  });

  // Build India FY month list: April -> March
  const today = new Date();
  const currentMonth = today.getMonth(); // 0 = Jan
  const currentYear = today.getFullYear();
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(fyStartYear, 3 + i, 1);
    const displayName = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    const key = displayName.toLowerCase();
    months.push({
      name: displayName,
      status: statusMap[key] || 'Not Started',
    });
  }

  return NextResponse.json(months);
}