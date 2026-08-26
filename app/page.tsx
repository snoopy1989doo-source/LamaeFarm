'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCattle, getFinanceSummary, getUpcomingVaccines, UpcomingVaccine } from '@/lib/storage';
import { Cattle } from '@/types';
import { useAuth } from '@/context/AuthContext';

function formatBaht(n: number) {
  return n.toLocaleString('th-TH') + ' บาท';
}

function formatDate(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

const STATUS_COLOR: Record<string, string> = {
  ในฟาร์ม: 'bg-green-100 text-green-700',
  ป่วย: 'bg-red-100 text-red-700',
  รอขาย: 'bg-yellow-100 text-yellow-700',
  ขายแล้ว: 'bg-gray-100 text-gray-500',
};

export default function HomePage() {
  const { role, logout } = useAuth();
  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netProfit: 0 });
  const [upcoming, setUpcoming] = useState<UpcomingVaccine[]>([]);

  useEffect(() => {
    setCattle(getCattle());
    setSummary(getFinanceSummary(currentMonth()));
    setUpcoming(getUpcomingVaccines(14));
  }, []);

  const activeCattle = cattle.filter((c) => c.status !== 'ขายแล้ว');
  const sickCattle = cattle.filter((c) => c.status === 'ป่วย');
  const soldCattle = cattle.filter((c) => c.status === 'ขายแล้ว');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-green-800">ภาพรวมฟาร์ม</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          ออกจากระบบ
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
          <div className="text-2xl mb-1">🐂</div>
          <div className="text-3xl font-bold text-green-700">{activeCattle.length}</div>
          <div className="text-xs text-gray-500">วัวในฟาร์ม</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">
          <div className="text-2xl mb-1">🏥</div>
          <div className="text-3xl font-bold text-red-600">{sickCattle.length}</div>
          <div className="text-xs text-gray-500">ป่วย/ดูแลพิเศษ</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-yellow-100">
          <div className="text-2xl mb-1">💉</div>
          <div className="text-3xl font-bold text-yellow-600">{upcoming.length}</div>
          <div className="text-xs text-gray-500">นัดวัคซีนใน 14 วัน</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl mb-1">✅</div>
          <div className="text-3xl font-bold text-gray-500">{soldCattle.length}</div>
          <div className="text-xs text-gray-500">ขายแล้ว</div>
        </div>
      </div>

      {/* Finance summary — owner only */}
      {role === 'owner' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
          <h2 className="font-semibold text-green-800 mb-3">💰 บัญชีเดือนนี้</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm text-gray-500">รายรับ</div>
              <div className="font-bold text-green-600">{formatBaht(summary.totalIncome)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">รายจ่าย</div>
              <div className="font-bold text-red-500">{formatBaht(summary.totalExpense)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">กำไร/ขาดทุน</div>
              <div className={`font-bold ${summary.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatBaht(summary.netProfit)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming vaccines */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-yellow-100">
          <h2 className="font-semibold text-yellow-700 mb-3">⚠️ วัคซีน/ถ่ายพยาธิที่ใกล้ถึงกำหนด</h2>
          <div className="space-y-2">
            {upcoming.slice(0, 5).map((v, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-green-700">{v.cattleId}</span>
                  <span className="text-gray-600 ml-2">{v.detail}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    v.daysLeft < 0
                      ? 'bg-red-100 text-red-600'
                      : v.daysLeft === 0
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {v.daysLeft < 0
                    ? `เกิน ${Math.abs(v.daysLeft)} วัน`
                    : v.daysLeft === 0
                    ? 'วันนี้!'
                    : `อีก ${v.daysLeft} วัน`}
                </span>
              </div>
            ))}
          </div>
          <Link href="/calendar" className="text-xs text-green-600 hover:underline mt-2 block">
            ดูปฏิทินทั้งหมด →
          </Link>
        </div>
      )}

      {/* Cattle list preview */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-green-800">🐄 วัวในฟาร์ม</h2>
          <Link href="/cattle" className="text-xs text-green-600 hover:underline">
            ดูทั้งหมด →
          </Link>
        </div>
        {activeCattle.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <div className="text-4xl mb-2">🐂</div>
            <p className="text-sm">ยังไม่มีวัวในฟาร์ม</p>
            <Link
              href="/cattle/new"
              className="mt-3 inline-block text-sm bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors"
            >
              + เพิ่มวัวตัวแรก
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activeCattle.slice(0, 5).map((cow) => (
              <Link
                key={cow.id}
                href={`/cattle/${cow.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-green-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cow.gender === 'เมีย' ? '🐄' : '🐂'}</span>
                  <div>
                    <div className="font-semibold text-green-800">{cow.id}</div>
                    <div className="text-xs text-gray-500">{cow.breed} · {cow.gender}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[cow.status]}`}>
                  {cow.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/cattle/new"
          className="bg-green-600 text-white rounded-2xl p-4 text-center font-semibold hover:bg-green-700 transition-colors shadow-sm"
        >
          🐂 เพิ่มวัว
        </Link>
        {role === 'owner' ? (
          <Link
            href="/finance"
            className="bg-yellow-500 text-white rounded-2xl p-4 text-center font-semibold hover:bg-yellow-600 transition-colors shadow-sm"
          >
            💰 บันทึกรายรับ-จ่าย
          </Link>
        ) : (
          <Link
            href="/calendar"
            className="bg-blue-500 text-white rounded-2xl p-4 text-center font-semibold hover:bg-blue-600 transition-colors shadow-sm"
          >
            📅 ดูปฏิทินวัคซีน
          </Link>
        )}
      </div>
    </div>
  );
}
