import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const client = searchParams.get('client');

  if (!month || !client) {
    return NextResponse.json({ error: 'month and client are required' }, { status: 400 });
  }

  const { data: clientRow } = await supabase
    .from('clients').select('id').eq('name', client).single();

  if (!clientRow) {
    return NextResponse.json({ exists: false, status: 'Not Started' });
  }

  const { data: survey } = await supabase
    .from('survey_master')
    .select('survey_id, status, conducted_by')
    .eq('month', month)
    .eq('client_id', clientRow.id)
    .maybeSingle();

  if (!survey) {
    return NextResponse.json({ exists: false, status: 'Not Started' });
  }

  return NextResponse.json({
    exists: true,
    surveyId: survey.survey_id,
    status: survey.status,
    conductedBy: survey.conducted_by || '',
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { month, client, conductedBy, status } = body;

  if (!month || !client) {
    return NextResponse.json({ error: 'month and client are required' }, { status: 400 });
  }

  const finalStatus = status || 'Completed';

  const { data: clientRow, error: clientError } = await supabase
    .from('clients').select('id').eq('name', client).single();

  if (clientError || !clientRow) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('survey_master')
    .select('survey_id')
    .eq('month', month)
    .eq('client_id', clientRow.id)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from('survey_master')
      .update({
        status: finalStatus,
        conducted_by: conductedBy || '',
        updated_at: new Date().toISOString(),
      })
      .eq('survey_id', existing.survey_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, surveyId: existing.survey_id, status: finalStatus });
  }

  const surveyId = 'SUR-' + Date.now();

  const { error: insertError } = await supabase.from('survey_master').insert({
    survey_id: surveyId,
    month,
    client_id: clientRow.id,
    status: finalStatus,
    conducted_by: conductedBy || '',
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, surveyId, status: finalStatus });
}