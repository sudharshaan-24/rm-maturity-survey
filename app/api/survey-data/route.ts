import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .order('qid');

  if (qError) {
    return NextResponse.json({ error: qError.message }, { status: 500 });
  }

  const { data: options, error: oError } = await supabase
    .from('options')
    .select('*');

  if (oError) {
    return NextResponse.json({ error: oError.message }, { status: 500 });
  }

  const result = questions.map((q) => ({
    qid: q.qid,
    area: q.area,
    stage: q.stage,
    question: q.question,
    weightage: q.weightage,
    scoreType: q.score_type,
    link: q.link || '',
    maxScoreLink: q.max_score_link || '',
    options: options
      .filter((o) => o.qid === q.qid)
      .map((o) => ({
        option: o.option_label,
        answer: o.answer,
        score: o.score,
      })),
  }));

  return NextResponse.json(result);
}