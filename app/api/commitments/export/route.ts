import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

function timeliness(plannedDate: string, actualDate: string | null) {
  if (!actualDate) return 'Pending';
  return actualDate <= plannedDate ? 'On Time' : 'Delayed';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const client = searchParams.get('client');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');

  if (!client) return NextResponse.json({ error: 'client is required' }, { status: 400 });

  const { data: clientRow } = await supabase.from('clients').select('id').eq('name', client).single();
  if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  let query = supabase.from('commitments').select('*').eq('client_id', clientRow.id).order('planned_date');
  if (fromDate) query = query.gte('planned_date', fromDate);
  if (toDate) query = query.lte('planned_date', toDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []).map((r, i) => ({
    'SI No': i + 1,
    'Planned Date': r.planned_date,
    'Area': r.area,
    'Nature of Activity': r.nature_of_activity,
    'Particulars': r.particulars,
    'Actual Date': r.actual_date || '-',
    'Remarks': r.remarks || '-',
    'Client': client,
    'Status': r.actual_date ? 'Completed' : 'Pending',
    'Timeliness': timeliness(r.planned_date, r.actual_date),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Commitments Summary');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Commitments_Summary_${client.replace(/\s+/g, '_')}.xlsx"`,
    },
  });
}