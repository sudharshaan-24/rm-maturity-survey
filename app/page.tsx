'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Month = { name: string; status: string };

const STATUS_OPTIONS = ['Not Started', 'Started', 'Completed'];

export default function StartAssessment() {
  const router = useRouter();
  const [clients, setClients] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [allMonths, setAllMonths] = useState<Month[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('Not Started');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then((data) => {
      setClients(data);
      if (data.length) setSelectedClient(data[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedClient) { setAllMonths([]); return; }
    setLoading(true);
    fetch('/api/months?client=' + encodeURIComponent(selectedClient))
      .then((r) => r.json())
      .then((data) => setAllMonths(data))
      .finally(() => setLoading(false));
  }, [selectedClient]);

  const filteredMonths = allMonths.filter((m) => m.status === selectedStatus);

  useEffect(() => {
    if (filteredMonths.length) {
      setSelectedMonth(filteredMonths[0].name);
    } else {
      setSelectedMonth('');
    }
  }, [selectedStatus, allMonths]);

  const statusColor =
    selectedStatus === 'Completed' ? { background: 'var(--color-success-bg)', color: 'var(--color-success)' } :
    selectedStatus === 'Started' ? { background: 'var(--color-warning-bg)', color: 'var(--color-warning)' } :
    { background: '#f1f5f9', color: 'var(--color-slate)' };

  const actionLabel = selectedStatus === 'Not Started' ? 'Start Assessment' : 'Continue Assessment';

  return (
    <main className="p-6 sm:p-10">
      <h1 className="mb-1">Start Assessment</h1>
      <div className="h-px mb-8" style={{ background: 'var(--color-line)' }} />

      <div className="card p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block font-semibold mb-2" style={{ color: 'var(--color-slate)' }}>Client</label>
            <select
              className="border rounded-lg px-4 py-3 w-full text-base"
              style={{ borderColor: 'var(--color-line)' }}
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              {clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-2" style={{ color: 'var(--color-slate)' }}>Survey Month</label>
            <select
              className="border rounded-lg px-4 py-3 w-full text-base"
              style={{ borderColor: 'var(--color-line)' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={filteredMonths.length === 0}
            >
              {filteredMonths.length === 0 ? (
                <option>No {selectedStatus.toLowerCase()} months</option>
              ) : (
                filteredMonths.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)
              )}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-2" style={{ color: 'var(--color-slate)' }}>Status</label>
            <select
              className="border rounded-lg px-4 py-3 w-full text-base font-semibold"
              style={{ borderColor: 'var(--color-line)', ...statusColor }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          {selectedStatus === 'Completed' ? (
            <button
              onClick={() => router.push('/summary?client=' + encodeURIComponent(selectedClient) + '&month=' + encodeURIComponent(selectedMonth))}
              disabled={!selectedMonth}
              className="btn-primary px-8 py-3"
            >
              View Summary →
            </button>
          ) : (
            <button
              onClick={() => router.push('/survey?client=' + encodeURIComponent(selectedClient) + '&month=' + encodeURIComponent(selectedMonth))}
              disabled={loading || !selectedClient || !selectedMonth}
              className="btn-primary px-8 py-3"
            >
              {loading ? 'Loading…' : actionLabel + ' →'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}