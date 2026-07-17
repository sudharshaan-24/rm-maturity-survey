import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: fetch saved responses for a survey
// Usage: /api/responses?surveyId=SUR-xxxx
// or: /api/responses?month=April 2026&client=ABC Textiles
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const surveyId = searchParams.get('surveyId');
  const month = searchParams.get('month');
  const client = searchParams.get('client');

  if (surveyId) {
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('survey_id', surveyId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (month && client) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id')
      .eq('name', client)
      .single();

    if (!clientRow) return NextResponse.json([]);

    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('survey_month', month)
      .eq('client_id', clientRow.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'surveyId or (month + client) required' }, { status: 400 });
}

// POST: save (replace) all responses for a survey
// Body: { surveyId, client, responses: [ { qid, area, stage, question, weightage, selectedAnswer, score, weightedContribution, scoreType, link, clientSideDocument, surveyMonth } ] }
export async function POST(request: Request) {
  const body = await request.json();
  const { surveyId, client, responses } = body;

  if (!surveyId || !responses || !Array.isArray(responses)) {
    return NextResponse.json({ error: 'surveyId and responses array are required' }, { status: 400 });
  }

  const { data: clientRow } = await supabase
    .from('clients')
    .select('id')
    .eq('name', client)
    .single();

  if (!clientRow) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Delete old responses for this survey first (mirrors deleteResponsesForSurvey + re-insert)
  const { error: deleteError } = await supabase
    .from('responses')
    .delete()
    .eq('survey_id', surveyId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (responses.length > 0) {
    const rows = responses.map((r: any) => ({
      survey_id: surveyId,
      client_id: clientRow.id,
      qid: r.qid,
      area: r.area,
      stage: r.stage,
      question: r.question,
      weightage: r.weightage,
      selected_answer: r.selectedAnswer,
      score: r.score,
      weighted_contribution: r.weightedContribution,
      score_type: r.scoreType,
      link: r.link || '',
      client_side_document: r.clientSideDocument || '',
      survey_month: r.surveyMonth,
    }));

    const { error: insertError } = await supabase.from('responses').insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: 'Survey Saved!' });
}