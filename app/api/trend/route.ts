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
  const client = searchParams.get('client');
  if (!client) return NextResponse.json({ error: 'client is required' }, { status: 400 });

  const { data: clientRow } = await supabase.from('clients').select('id').eq('name', client).single();
  if (!clientRow) return NextResponse.json([]);

  const { data: surveys } = await supabase
    .from('survey_master')
    .select('survey_id, month, status')
    .eq('client_id', clientRow.id)
    .eq('status', 'Completed');

  if (!surveys || surveys.length === 0) return NextResponse.json([]);

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const withDates = surveys
    .map((s) => {
      const parts = s.month.split(' ');
      const idx = monthNames.indexOf(parts[0]);
      const year = parseInt(parts[1], 10);
      return { ...s, sortDate: new Date(year, idx, 1) };
    })
    .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

  const { data: metricBands } = await supabase.from('metric_scorecard').select('*');
  const overallBands = (metricBands || []).filter((b) => b.score_type === 'Overall');

  const trend: { month: string; overallScore: number; interpretation: string }[] = [];

  for (const s of withDates) {
    const { data: rows } = await supabase.from('responses').select('*').eq('survey_id', s.survey_id);
    if (!rows || rows.length === 0) continue;

    const dedupMap: Record<string, any> = {};
    rows.forEach((r) => { dedupMap[r.qid] = r; });
    const deduped = Object.values(dedupMap);

    const scoreTypeTotals: Record<string, { weight: number; weighted: number }> = {};
    deduped.forEach((r: any) => {
      const weight = Number(r.weightage);
      const weighted = Number(r.weighted_contribution);
      const scoreType = String(r.score_type || '').trim();
      if (scoreType) {
        if (!scoreTypeTotals[scoreType]) scoreTypeTotals[scoreType] = { weight: 0, weighted: 0 };
        scoreTypeTotals[scoreType].weight += weight;
        scoreTypeTotals[scoreType].weighted += weighted;
      }
    });

    const scoreTypeScores = Object.keys(scoreTypeTotals).map((type) => {
      const t = scoreTypeTotals[type];
      return t.weight === 0 ? 0 : (t.weighted / t.weight) * 10;
    });

    const overallScore = scoreTypeScores.length === 0
      ? 0
      : scoreTypeScores.reduce((a, b) => a + b, 0) / scoreTypeScores.length;

    trend.push({
      month: s.month,
      overallScore: Number(overallScore.toFixed(2)),
      interpretation: pickBand(overallScore, overallBands),
    });
  }

  return NextResponse.json(trend);
}