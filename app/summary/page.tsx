'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GaugeCircle } from '@/components/GaugeCircle';

function SummaryView() {
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<string[]>([]);
  const [months, setMonths] = useState<{ name: string; status: string }[]>([]);
  const [client, setClient] = useState(searchParams.get('client') || '');
  const [month, setMonth] = useState(searchParams.get('month') || '');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then((data) => {
      setClients(data);
      if (!client && data.length) setClient(data[0]);
    });
  }, []);

  useEffect(() => {
    if (!client) return;
    fetch('/api/months?client=' + encodeURIComponent(client)).then((r) => r.json()).then((data) => {
      const completedOnly = data.filter((m: { status: string }) => m.status === 'Completed');
      setMonths(completedOnly);
      if (!month && completedOnly.length) setMonth(completedOnly[0].name);
    });
  }, [client]);

  const loadSummary = () => {
    if (!client || !month) return;
    setLoading(true);
    fetch('/api/summary?month=' + encodeURIComponent(month) + '&client=' + encodeURIComponent(client))
      .then((r) => r.json())
      .then(setSummary)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (searchParams.get('client') && searchParams.get('month')) loadSummary();
  }, []);

  const handleDownloadPdf = async () => {
    if (!printRef.current || !summary) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = 'RM_Maturity_Summary_' + client.replace(/\s+/g, '_') + '_' + month.replace(/\s+/g, '_') + '.pdf';
      pdf.save(fileName);
    } finally {
      setExporting(false);
    }
  };

  const gaugeColors = ['var(--color-success)', 'var(--color-primary)', '#8B5CF6', '#D97706', '#DC2626'];

  return (
    <main className="p-6 sm:p-10">
      <h1 className="mb-1">Month Wise Summary</h1>
      <div className="h-px mb-6" style={{ background: 'var(--color-line)' }} />

      <div className="card p-6 mb-6 flex flex-col sm:flex-row gap-4 sm:items-end">
        <div className="flex-1">
          <label className="block font-semibold mb-2" style={{ color: 'var(--color-slate)' }}>Client</label>
          <select className="border rounded-lg px-4 py-2.5 w-full text-base" style={{ borderColor: 'var(--color-line)' }}
            value={client} onChange={(e) => { setClient(e.target.value); setMonth(''); }}>
            {clients.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block font-semibold mb-2" style={{ color: 'var(--color-slate)' }}>Survey Month</label>
          <select className="border rounded-lg px-4 py-2.5 w-full text-base" style={{ borderColor: 'var(--color-line)' }}
            value={month} onChange={(e) => setMonth(e.target.value)} disabled={months.length === 0}>
            {months.length === 0 ? (
              <option>No completed months</option>
            ) : (
              months.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)
            )}
          </select>
        </div>
        <button onClick={loadSummary} className="btn-primary px-6 py-2.5" disabled={!month}>
          {loading ? 'Loading…' : 'Load Summary'}
        </button>
        {summary && (
          <button onClick={handleDownloadPdf} disabled={exporting} className="btn-outline px-6 py-2.5">
            {exporting ? 'Preparing PDF…' : '⬇ Download PDF'}
          </button>
        )}
      </div>

      {months.length === 0 && (
        <p style={{ color: 'var(--color-slate)' }}>No completed surveys yet for this client.</p>
      )}
      {!summary && !loading && months.length > 0 && (
        <p style={{ color: 'var(--color-slate)' }}>Select a month, then click Load Summary.</p>
      )}

      {summary && (
        <div ref={printRef} style={{ background: 'white', padding: '1.5rem' }}>
          <h2 className="mb-3" style={{ color: 'var(--color-primary)' }}>{client} — {month}</h2>

          <div className="card overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead><tr className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                <th className="text-left p-3">Metric</th><th className="text-left p-3">Value</th><th className="text-left p-3">Interpretation</th>
              </tr></thead>
              <tbody>
                <tr className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                  <td className="p-3">Total Weightage %</td><td className="p-3 mono">{summary.totalWeightage}</td><td className="p-3">Should be 100%</td>
                </tr>
                <tr className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                  <td className="p-3">Overall Score /10</td><td className="p-3 mono">{summary.overallScore.toFixed(1)}</td><td className="p-3">{summary.overallInterpretation}</td>
                </tr>
                {summary.scoreTypes.map((s: any) => (
                  <tr key={s.scoreType} className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                    <td className="p-3">{s.scoreType} Score /10</td><td className="p-3 mono">{s.score.toFixed(1)}</td><td className="p-3">{s.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-6 mb-6 flex flex-wrap justify-center gap-8">
            <GaugeCircle label="Overall Score" score={summary.overallScore} color={gaugeColors[0]} />
            {summary.scoreTypes.map((s: any, i: number) => (
              <GaugeCircle key={s.scoreType} label={s.scoreType} score={s.score} color={gaugeColors[(i + 1) % gaugeColors.length]} />
            ))}
          </div>

          <h2 className="mb-3">Section Wise Summary</h2>
          <div className="card overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead><tr className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                <th className="text-left p-3">Section</th><th className="text-left p-3">Weightage %</th><th className="text-left p-3">Score /10</th><th className="text-left p-3">Interpretation</th>
              </tr></thead>
              <tbody>
                {summary.sections.map((s: any) => (
                  <tr key={s.section} className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                    <td className="p-3">{s.section}</td><td className="p-3 mono">{s.weightagePercent}</td><td className="p-3 mono">{s.score.toFixed(1)}</td><td className="p-3">{s.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mb-3">Consultant Note</h2>
          <p className="card p-4 text-sm mb-6">{summary.consultantNote}</p>

          <h2 className="mb-3">Survey Responses</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead><tr className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                <th className="text-left p-3">Area</th><th className="text-left p-3">Question</th><th className="text-left p-3">Weightage %</th>
                <th className="text-left p-3">Selected Answer</th><th className="text-left p-3">Score</th><th className="text-left p-3">Weighted</th><th className="text-left p-3">Score Type</th>
              </tr></thead>
              <tbody>
                {summary.responses.map((r: any, i: number) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                    <td className="p-3">{r.area}</td>
                    <td className="p-3 whitespace-normal max-w-md">{r.question}</td>
                    <td className="p-3 mono">{r.weightagePercent}</td>
                    <td className="p-3 whitespace-normal max-w-md">{r.selectedAnswer}</td>
                    <td className="p-3 mono">{r.score.toFixed(1)}</td>
                    <td className="p-3 mono">{r.weightedContribution.toFixed(2)}</td>
                    <td className="p-3">{r.scoreType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <SummaryView />
    </Suspense>
  );
}