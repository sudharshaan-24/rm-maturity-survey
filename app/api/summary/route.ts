import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function pickBand(score: number, bands: { min_score: number; max_score: number; label: string }[]) {
  if (!bands || bands.length === 0) return '-';
  const sorted = [...bands].sort((a, b) => a.min_score - b.min_score);
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const isLast = i === sorted.length - 1;
    if (score >= b.min_score && (score < b.max_score || isLast)) return b.label;
  }
  return sorted[sorted.length - 1].label;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const client = searchParams.get('client');

  if (!month || !client) {
    return NextResponse.json({ error: 'month and client are required' }, { status: 400 });
  }

  const { data: clientRow } = await supabase
    .from('clients')
    .select('id')
    .eq('name', client)
    .single();

  if (!clientRow) {
    return NextResponse.json(null);
  }

  const { data: survey } = await supabase
    .from('survey_master')
    .select('survey_id')
    .eq('month', month)
    .eq('client_id', clientRow.id)
    .maybeSingle();

  if (!survey) {
    return NextResponse.json(null);
  }

  const { data: rows, error } = await supabase
    .from('responses')
    .select('*')
    .eq('survey_id', survey.survey_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json(null);

  const dedupMap: Record<string, any> = {};
  rows.forEach((r) => { dedupMap[r.qid] = r; });
  const dedupedRows = Object.values(dedupMap);

  let totalWeight = 0, totalWeighted = 0;
  const scoreTypeTotals: Record<string, { weight: number; weighted: number }> = {};
  const sections: Record<string, { weight: number; weighted: number }> = {};
  const responseRows: any[] = [];

  dedupedRows.forEach((r: any) => {
    const weight = Number(r.weightage);
    const weighted = Number(r.weighted_contribution);
    const scoreType = String(r.score_type || '').trim();
    const area = r.area;

    responseRows.push({
      area, stage: r.stage, question: r.question,
      weightagePercent: weight, selectedAnswer: r.selected_answer,
      score: Number(r.score), weightedContribution: weighted,
      scoreType, clientDocument: r.client_side_document || '',
    });

    totalWeight += weight;
    totalWeighted += weighted;

    if (scoreType) {
      if (!scoreTypeTotals[scoreType]) scoreTypeTotals[scoreType] = { weight: 0, weighted: 0 };
      scoreTypeTotals[scoreType].weight += weight;
      scoreTypeTotals[scoreType].weighted += weighted;
    }

    if (!sections[area]) sections[area] = { weight: 0, weighted: 0 };
    sections[area].weight += weight;
    sections[area].weighted += weighted;
  });

  const { data: metricBands } = await supabase.from('metric_scorecard').select('*');
  const { data: sectionBands } = await supabase.from('section_scorecard').select('*');

  const overallBands = (metricBands || []).filter((b) => b.score_type === 'Overall');

  const scoreTypeResults = Object.keys(scoreTypeTotals).map((type) => {
    const t = scoreTypeTotals[type];
    const score = t.weight === 0 ? 0 : (t.weighted / t.weight) * 10;
    const typeBand = (metricBands || []).find((b) => b.score_type === type);
    return {
      scoreType: type,
      score,
      interpretation: typeBand ? typeBand.label : pickBand(score, overallBands),
    };
  });

  const overallScore = scoreTypeResults.length === 0
    ? 0
    : scoreTypeResults.reduce((sum, s) => sum + s.score, 0) / scoreTypeResults.length;

  const overallInterpretation = pickBand(overallScore, overallBands);

  const sectionResults = Object.keys(sections).map((area) => {
    const sec = sections[area];
    const score = sec.weight === 0 ? 0 : (sec.weighted / sec.weight) * 10;
    return {
      section: area,
      weightagePercent: sec.weight,
      score,
      interpretation: pickBand(score, sectionBands || []),
    };
  });

  let consultantNote = 'No Score Type data available for this month.';
  if (scoreTypeResults.length === 1) {
    const only = scoreTypeResults[0];
    consultantNote = `${only.scoreType} scores ${only.score.toFixed(1)}/10 — ${pickBand(only.score, sectionBands || []).toLowerCase()} overall.`;
  } else if (scoreTypeResults.length > 1) {
    let top = scoreTypeResults[0], bottom = scoreTypeResults[0];
    scoreTypeResults.forEach((s) => {
      if (s.score > top.score) top = s;
      if (s.score < bottom.score) bottom = s;
    });
    const diff = top.score - bottom.score;
    const avg = scoreTypeResults.reduce((sum, s) => sum + s.score, 0) / scoreTypeResults.length;
    const allNames = scoreTypeResults.map((s) => s.scoreType).join(', ');

    if (diff >= 1.5) {
      consultantNote = `${top.scoreType} is ahead of ${bottom.scoreType} — the gap suggests ${bottom.scoreType.toLowerCase()} needs focused attention to catch up.`;
    } else if (avg >= 8) {
      consultantNote = `All areas (${allNames}) are performing strongly — a mature, leadership-driven review system is in place.`;
    } else if (avg < 4) {
      consultantNote = `All areas (${allNames}) are weak — foundational systems and review discipline both need urgent attention.`;
    } else {
      consultantNote = `${allNames} are broadly aligned — continue reinforcing current practices while closing remaining gaps.`;
    }
  }

  return NextResponse.json({
    client,
    totalWeightage: totalWeight,
    overallScore,
    overallInterpretation,
    scoreTypes: scoreTypeResults,
    sections: sectionResults,
    consultantNote,
    responses: responseRows,
  });
}