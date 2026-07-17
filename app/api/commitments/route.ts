import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: list commitments, optionally filtered by client
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const client = searchParams.get('client');

  let query = supabase
    .from('commitments')
    .select('*, clients(name)')
    .order('planned_date', { ascending: true });

  if (client) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id')
      .eq('name', client)
      .single();

    if (clientRow) {
      query = query.eq('client_id', clientRow.id);
    } else {
      return NextResponse.json([]);
    }
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (data || []).map((row: any) => ({
    id: row.id,
    plannedDate: row.planned_date,
    area: row.area,
    natureOfActivity: row.nature_of_activity,
    particulars: row.particulars,
    actualDate: row.actual_date,
    attachmentUrl: row.attachment_url,
    remarks: row.remarks,
    client: row.clients?.name || '',
  }));

  return NextResponse.json(result);
}

// POST: add a new commitment
export async function POST(request: Request) {
  const body = await request.json();
  const { client, area, natureOfActivity, particulars, plannedDate, actualDate, remarks } = body;

  if (!client || !area || !plannedDate) {
    return NextResponse.json({ error: 'client, area, and plannedDate are required' }, { status: 400 });
  }

  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('name', client)
    .single();

  if (clientError || !clientRow) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { error } = await supabase.from('commitments').insert({
    client_id: clientRow.id,
    area,
    nature_of_activity: natureOfActivity || '',
    particulars: particulars || '',
    planned_date: plannedDate,
    actual_date: actualDate || null,
    remarks: remarks || '',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// PUT: update an existing commitment (e.g., mark actual date done)
export async function PUT(request: Request) {
  const body = await request.json();
  const { id, area, natureOfActivity, particulars, plannedDate, actualDate, remarks } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('commitments')
    .update({
      area,
      nature_of_activity: natureOfActivity || '',
      particulars: particulars || '',
      planned_date: plannedDate,
      actual_date: actualDate || null,
      remarks: remarks || '',
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}