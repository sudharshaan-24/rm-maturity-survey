'use client';

import { useEffect, useState } from 'react';
import { TrendChart } from '@/components/TrendChart';

type Point = { month: string; overallScore: number; interpretation: string };

export default function OverallSummaryPage() {
  const [clients, setClients] = useState<string[]>([]);
  const [client, setClient] = useState('');
  const [allTrend, setAllTrend] = useState<Point[]>([]);
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then((data) => {
      setClients(data);
      if (data.length) setClient(data[0]);
    });
  }, []);

  useEffect(() => {
    if (!client) return;
    setLoading(true);
    fetch('/api/trend?client=' + encodeURIComponent(client))
      .then((r) => r.json())
      .then((data: Point[]) => {
        setAllTrend(data);
        if (data.length) {
          setFromMonth(data[0].month);
          setToMonth(data[data.length - 1].month);
        } else {
          setFromMonth('');
          setToMonth('');
        }
      })
      .finally(() => setLoading(false));
  }, [client]);

  const fromIdx = allTrend.findIndex((p) => p.month === fromMonth);
  const toIdx = allTrend.findIndex((p) => p.month === toMonth);
  const visible = fromIdx !== -1 && toIdx !== -1 && fromIdx <= toIdx
    ? allTrend.slice(fromIdx, toIdx + 1)
    : allTrend;

  return (
    <main className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-1">Overall Summary</h1>
      <div className="h-px mb-6" style={{ background: 'var(--color-line)' }} />

      <div className="card p-5 sm:p-6 mb-6">
        <h2 className="font-bold mb-1">Overall RM Maturity Survey Score Trend</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-slate)' }}>
          Overall score across completed months for the selected client, so you can see progress at a glance.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--color-slate)' }}>Client</label>
            <select
              className="border rounded-lg px-3 py-2 w-full mt-1 text-sm"
              style={{ borderColor: 'var(--color-line)' }}
              value={client}
              onChange={(e) => setClient(e.target.value)}
            >
              {clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--color-slate)' }}>From Month</label>
            <select
              className="border rounded-lg px-3 py-2 w-full mt-1 text-sm"
              style={{ borderColor: 'var(--color-line)' }}
              value={fromMonth}
              onChange={(e) => setFromMonth(e.target.value)}
              disabled={allTrend.length === 0}
            >
              {allTrend.map((p) => <option key={p.month} value={p.month}>{p.month}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--color-slate)' }}>To Month</label>
            <select
              className="border rounded-lg px-3 py-2 w-full mt-1 text-sm"
              style={{ borderColor: 'var(--color-line)' }}
              value={toMonth}
              onChange={(e) => setToMonth(e.target.value)}
              disabled={allTrend.length === 0}
            >
              {allTrend.map((p) => <option key={p.month} value={p.month}>{p.month}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--color-slate)' }}>Loading…</p>
        ) : allTrend.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-slate)' }}>No completed surveys yet for this client.</p>
        ) : (
          <TrendChart data={visible} />
        )}
      </div>

      {visible.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 pb-0">
            <h2 className="font-bold" style={{ color: 'var(--color-primary)' }}>Score by Month</h2>
          </div>
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                <th className="text-left p-3">Month</th>
                <th className="text-left p-3">Overall Score</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.month} className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                  <td className="p-3 font-medium">{p.month}</td>
                  <td className="p-3">
                    <span className="pill" style={{ background: '#eaf2fb', color: 'var(--color-primary)' }}>
                      {p.overallScore.toFixed(2)} / 10 · {p.interpretation}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}