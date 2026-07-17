import Link from 'next/link';

export function Header({ backHref }: { backHref?: string }) {
  return (
    <header className="border-b" style={{ borderColor: 'var(--color-line)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link href={backHref} className="text-sm" style={{ color: 'var(--color-slate)' }}>
              &larr;
            </Link>
          )}
          <Link href="/" className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
            RM Maturity Survey
          </Link>
        </div>
        <Link
          href="/commitments"
          className="text-sm font-medium hidden sm:inline"
          style={{ color: 'var(--color-primary)' }}
        >
          Commitments
        </Link>
      </div>
    </header>
  );
}