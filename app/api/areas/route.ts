import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('questions')
    .select('area');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const areas = Array.from(new Set((data || []).map((row) => row.area))).filter(Boolean);
  return NextResponse.json(areas);
}