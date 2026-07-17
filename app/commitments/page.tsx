'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';

type Commitment = {
  id: string;
  plannedDate: string;
  area: string;
  natureOfActivity: string;
  particulars: string;
  actualDate: string | null;
  remarks: string;
  client: string;
};

function timeliness(c: Commitment) {
  if (!c.actualDate) return 'Pending';
  return c.actualDate <= c.plannedDate ? 'On Time' : 'Delayed';
}

function formatDate(d: string) {
  if (!d) return '-';
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CommitmentsPage() {
  const [tab, setTab] = useState<'list' | 'summary'>('list');

  const [clients, setClients] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ area: '', natureOfActivity: '', particulars: '', plannedDate: '' });
  const [saving, setSaving] = useState(false);

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState({ actualDate: '', remarks: '' });
  const [completeSaving, setCompleteSaving] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then((data) => {
      setClients(data);
      if (data.length) setSelectedClient(data[0]);
    });
    fetch('/api/areas').then((r) => r.json()).then(setAreas);
  }, []);

  const loadCommitments = (client: string) => {
    if (!client) { setCommitments([]); return; }
    setLoading(true);
    fetch('/api/commitments?client=' + encodeURIComponent(client))
      .then((r) => r.json())
      .then(setCommitments)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCommitments(selectedClient);
  }, [selectedClient]);

  const handleAddPlan = async () => {
    if (!selectedClient || !form.area || !form.plannedDate) {
      alert('Client, area, and planned date are required.');
      return;
    }
    setSaving(true);
    await fetch('/api/commitments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: selectedClient, ...form }),
    });
    setForm({ area: '', natureOfActivity: '', particulars: '', plannedDate: '' });
    setShowAddModal(false);
    loadCommitments(selectedClient);
    setSaving(false);
  };

  const startCompleting = (c: Commitment) => {
    setCompletingId(c.id);
    setCompleteForm({ actualDate: c.actualDate || '', remarks: c.remarks || '' });
  };

  const handleSaveComplete = async (c: Commitment) => {
    setCompleteSaving(true);
    await fetch('/api/commitments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: c.id,
        area: c.area,
        natureOfActivity: c.natureOfActivity,
        particulars: c.particulars,
        plannedDate: c.plannedDate,
        actualDate: completeForm.actualDate,
        remarks: completeForm.remarks,
      }),
    });
    setCompletingId(null);
    loadCommitments(selectedClient);
    setCompleteSaving(false);
  };

  const filteredForSummary = useMemo(() => {
    return commitments.filter((c) => {
      if (fromDate && c.plannedDate < fromDate) return false;
      if (toDate && c.plannedDate > toDate) return false;
      return true;
    });
  }, [commitments, fromDate, toDate]);

  const stats = useMemo(() => {
    const total = filteredForSummary.length;
    const completed = filteredForSummary.filter((c) => !!c.actualDate).length;
    const pending = total - completed;
    const onTime = filteredForSummary.filter((c) => timeliness(c) === 'On Time').length;
    const delayed = filteredForSummary.filter((c) => timeliness(c) === 'Delayed').length;
    return { total, completed, pending, onTime, delayed };
  }, [filteredForSummary]);

  const handleDownload = () => {
    const params = new URLSearchParams({ client: selectedClient });
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    window.location.href = '/api/commitments/export?' + params.toString();
  };

  const timelinessPill = (label: string) => {
    if (label === 'On Time') return <span className="pill pill-success">On Time</span>;
    if (label === 'Delayed') return <span className="pill pill-danger">Delayed</span>;
    return <span className="pill pill-warning">Pending</span>;
  };

  return (
    <main className="p-6 sm:p-10">
      <h1 className="mb-1">Commitments</h1>
      <div className="h-px mb-4" style={{ background: 'var(--color-line)' }} />

      <div className="flex gap-6 mb-6" style={{ borderBottom: '1px solid var(--color-line)' }}>
        <button
          onClick={() => setTab('list')}
          className="pb-3 text-base font-semibold"
          style={{
            color: tab === 'list' ? 'var(--color-primary)' : 'var(--color-slate)',
            borderBottom: tab === 'list' ? '2px solid var(--color-primary)' : '2px solid transparent',
          }}
        >
          Commitments
        </button>
        <button
          onClick={() => setTab('summary')}
          className="pb-3 text-base font-semibold"
          style={{
            color: tab === 'summary' ? 'var(--color-primary)' : 'var(--color-slate)',
            borderBottom: tab === 'summary' ? '2px solid var(--color-primary)' : '2px solid transparent',
          }}
        >
          Commitments Summary
        </button>
      </div>

      <div className="card p-6 mb-6">
        <label className="block font-semibold mb-2" style={{ color: 'var(--color-slate)' }}>Client</label>
        <select
          className="border rounded-lg px-4 py-2.5 w-full max-w-sm text-base"
          style={{ borderColor: 'var(--color-line)' }}
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
        >
          {clients.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {tab === 'list' && (
        <div className="card p-6 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h2>Commitments</h2>
            <button onClick={() => setShowAddModal(true)} className="btn-primary px-5 py-2.5">
              + Add Commitment
            </button>
          </div>

          {loading ? (
            <p style={{ color: 'var(--color-slate)' }}>Loading...</p>
          ) : commitments.length === 0 ? (
            <p style={{ color: 'var(--color-slate)' }}>No commitments yet for this client.</p>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                  <th className="text-left p-3">SI No</th>
                  <th className="text-left p-3">Planned Date</th>
                  <th className="text-left p-3">Area</th>
                  <th className="text-left p-3">Nature of Activity</th>
                  <th className="text-left p-3">Particulars</th>
                  <th className="text-left p-3">Actual Date</th>
                  <th className="text-left p-3">Attachment</th>
                  <th className="text-left p-3">Remarks</th>
                  <th className="text-left p-3">Client</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {commitments.map((c, i) => (
                  <tr key={c.id} className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 mono">{formatDate(c.plannedDate)}</td>
                    <td className="p-3">{c.area}</td>
                    <td className="p-3">{c.natureOfActivity || '-'}</td>
                    <td className="p-3 whitespace-normal max-w-xs">{c.particulars || '-'}</td>
                    <td className="p-3 mono">{c.actualDate ? formatDate(c.actualDate) : '-'}</td>
                    <td className="p-3">-</td>
                    <td className="p-3 whitespace-normal max-w-xs">{c.remarks || '-'}</td>
                    <td className="p-3">{c.client}</td>
                    <td className="p-3">
                      {c.actualDate ? (
                        <span className="pill pill-success">Completed</span>
                      ) : (
                        <button onClick={() => startCompleting(c)} className="btn-outline px-3 py-1.5 text-sm">
                          Mark Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'summary' && (
        <>
          <div className="card p-6 mb-6">
            <h2 className="mb-4">Commitments Summary</h2>
            <div className="flex flex-wrap items-end gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-slate)' }}>From Date</label>
                <input
                  type="date"
                  className="border rounded-lg px-3 py-2 text-base"
                  style={{ borderColor: 'var(--color-line)' }}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-slate)' }}>To Date</label>
                <input
                  type="date"
                  className="border rounded-lg px-3 py-2 text-base"
                  style={{ borderColor: 'var(--color-line)' }}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <button
                onClick={() => { setFromDate(''); setToDate(''); }}
                className="btn-outline px-4 py-2 text-sm"
              >
                Reset
              </button>
              <button
                onClick={handleDownload}
                disabled={!selectedClient}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                ⬇ Download Summary (Excel)
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="rounded-xl p-4 text-center" style={{ background: '#eaf2fb' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.total}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-primary)' }}>TOTAL COMMITMENTS</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-success-bg)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{stats.completed}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-success)' }}>COMPLETED</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-warning-bg)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-warning)' }}>{stats.pending}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-warning)' }}>PENDING</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: '#e0f6f4' }}>
                <p className="text-2xl font-bold" style={{ color: '#0a7a72' }}>{stats.onTime}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: '#0a7a72' }}>ON TIME</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-danger-bg)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-danger)' }}>{stats.delayed}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-danger)' }}>DELAYED</p>
              </div>
            </div>
          </div>

          <div className="card p-6 overflow-x-auto">
            <h2 className="mb-4">Commitments in Selected Range</h2>
            {filteredForSummary.length === 0 ? (
              <p style={{ color: 'var(--color-slate)' }}>No commitments in this range.</p>
            ) : (
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                    <th className="text-left p-3">SI No</th>
                    <th className="text-left p-3">Planned Date</th>
                    <th className="text-left p-3">Area</th>
                    <th className="text-left p-3">Nature of Activity</th>
                    <th className="text-left p-3">Particulars</th>
                    <th className="text-left p-3">Actual Date</th>
                    <th className="text-left p-3">Remarks</th>
                    <th className="text-left p-3">Client</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Timeliness</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForSummary.map((c, i) => (
                    <tr key={c.id} className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3 mono">{formatDate(c.plannedDate)}</td>
                      <td className="p-3">{c.area}</td>
                      <td className="p-3">{c.natureOfActivity || '-'}</td>
                      <td className="p-3 whitespace-normal max-w-xs">{c.particulars || '-'}</td>
                      <td className="p-3 mono">{c.actualDate ? formatDate(c.actualDate) : '-'}</td>
                      <td className="p-3 whitespace-normal max-w-xs">{c.remarks || '-'}</td>
                      <td className="p-3">{c.client}</td>
                      <td className="p-3">
                        {c.actualDate ? <span className="pill pill-success">Completed</span> : <span className="pill pill-warning">Pending</span>}
                      </td>
                      <td className="p-3">{timelinessPill(timeliness(c))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Commitment">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-slate)' }}>Area</label>
            <select
              className="border rounded-lg px-3 py-2.5 w-full text-base"
              style={{ borderColor: 'var(--color-line)' }}
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            >
              <option value="">Select area…</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-slate)' }}>Nature of Activity</label>
            <input
              className="border rounded-lg px-3 py-2.5 w-full text-base"
              style={{ borderColor: 'var(--color-line)' }}
              value={form.natureOfActivity}
              onChange={(e) => setForm({ ...form, natureOfActivity: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-slate)' }}>Particulars</label>
            <input
              className="border rounded-lg px-3 py-2.5 w-full text-base"
              style={{ borderColor: 'var(--color-line)' }}
              value={form.particulars}
              onChange={(e) => setForm({ ...form, particulars: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-slate)' }}>Planned Date</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2.5 w-full text-base"
              style={{ borderColor: 'var(--color-line)' }}
              value={form.plannedDate}
              onChange={(e) => setForm({ ...form, plannedDate: e.target.value })}
            />
          </div>
          <button onClick={handleAddPlan} disabled={saving} className="btn-primary px-5 py-2.5 w-full">
            {saving ? 'Saving...' : 'Save Commitment'}
          </button>
        </div>
      </Modal>

      <Modal open={!!completingId} onClose={() => setCompletingId(null)} title="Mark Commitment Completed">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-slate)' }}>Actual Date</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2.5 w-full text-base"
              style={{ borderColor: 'var(--color-line)' }}
              value={completeForm.actualDate}
              onChange={(e) => setCompleteForm({ ...completeForm, actualDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-slate)' }}>Remarks</label>
            <input
              className="border rounded-lg px-3 py-2.5 w-full text-base"
              style={{ borderColor: 'var(--color-line)' }}
              value={completeForm.remarks}
              onChange={(e) => setCompleteForm({ ...completeForm, remarks: e.target.value })}
            />
          </div>
          <button
            onClick={() => {
              const c = commitments.find((cc) => cc.id === completingId);
              if (c) handleSaveComplete(c);
            }}
            disabled={completeSaving}
            className="btn-primary px-5 py-2.5 w-full"
          >
            {completeSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>
    </main>
  );
}