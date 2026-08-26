'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { href: '/', label: 'หน้าหลัก', icon: '🏠' },
  { href: '/cattle', label: 'วัว', icon: '🐂' },
  { href: '/calendar', label: 'ปฏิทิน', icon: '📅' },
  { href: '/finance', label: 'บัญชี', icon: '💰', ownerOnly: true },
  { href: '/settings', label: 'ตั้งค่า', icon: '⚙️' },
];

export function Navbar() {
  const pathname = usePathname();
  const { role } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.ownerOnly || role === 'owner'
  );

  return (
    <>
      {/* Top bar */}
      <header className="bg-green-700 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐂</span>
          <span className="font-bold text-lg">ละแมฟาร์ม</span>
        </div>
        <span className="text-xs bg-green-600 px-2 py-1 rounded-full">
          {role === 'owner' ? '👑 เจ้าของ' : '👷 คนดูแล'}
        </span>
      </header>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
        <div className="flex justify-around">
          {visibleItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                  isActive
                    ? 'text-green-700 font-semibold'
                    : 'text-gray-500'
                }`}
              >
                <span className="text-xl mb-0.5">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Side nav (desktop) */}
      <aside className="hidden md:flex flex-col fixed left-0 top-14 h-full w-52 bg-green-50 border-r border-green-200 pt-4 z-30">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-green-100 text-green-800 font-semibold border-r-4 border-green-600'
                  : 'text-gray-600 hover:bg-green-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </aside>
    </>
  );
}
