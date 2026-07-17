'use client';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: 'rgba(16, 24, 40, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2>{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: 'var(--color-slate)' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}