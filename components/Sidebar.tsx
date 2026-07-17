'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Start Assessment', icon: '📄' },
  { href: '/summary', label: 'Month Wise Summary', icon: '🗓' },
  { href: '/trend', label: 'Overall Summary', icon: '📈' },
  { href: '/commitments', label: 'Commitments', icon: '✅' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 min-h-screen shrink-0 hidden sm:block"
      style={{ background: 'var(--color-ink-dark)' }}
    >
      <div className="p-6">
        <h1 className="text-white font-bold text-xl leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          RM Maturity Survey
        </h1>
      </div>
      <nav className="px-4 space-y-2">
        {navItems.map((item) => {
          const active = item.href === '/'
            ? (pathname === '/' || pathname.startsWith('/survey'))
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-semibold transition-colors"
              style={{
                background: active ? 'var(--color-primary)' : 'transparent',
                color: active ? 'white' : '#B8C4D9',
              }}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}