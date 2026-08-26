'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCattle, saveCattle } from '@/lib/storage';
import { Cattle } from '@/types';

interface VaccineEvent {
  cattleId: string;
  cowGender: Cattle['gender'];
  detail: string;
  date: string;
  isDue: boolean; // nextDueDate based
  done: boolean;
  healthId: string;
}

function formatDate(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function daysFromNow(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CalendarPage() {
  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [events, setEvents] = useState<VaccineEvent[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showAll, setShowAll] = useState(false);

  function load() {
    const all = getCattle();
    setCattle(all);

    const evts: VaccineEvent[] = [];
    for (const cow of all) {
      if (cow.status === 'ขายแล้ว') continue;
      for (const hr of cow.healthRecords) {
        if (hr.nextDueDate) {
          evts.push({
            cattleId: cow.id,
            cowGender: cow.gender,
            detail: hr.detail,
            date: hr.nextDueDate,
            isDue: true,
            done: false,
            healthId: hr.id,
          });
        }
      }
    }
    evts.sort((a, b) => a.date.localeCompare(b.date));
    setEvents(evts);
  }

  useEffect(() => { load(); }, []);

  // Filter by selected month
  const filtered = showAll
    ? events
    : events.filter((e) => e.date.startsWith(filterMonth));

  const overdue = events.filter((e) => daysFromNow(e.date) < 0);
  const thisWeek = events.filter((e) => { const d = daysFromNow(e.date); return d >= 0 && d <= 7; });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-green-800">📅 ปฏิทินวัคซีน</h1>

      {/* Alerts */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <h2 className="font-semibold text-red-700 mb-2">🚨 เกินกำหนดแล้ว ({overdue.length} รายการ)</h2>
          <div className="space-y-1">
            {overdue.map((e, i) => (
              <div key={i} className="text-sm flex justify-between items-center">
                <span>
                  <span className="font-medium text-red-700">{e.cattleId}</span>
                  <span className="text-gray-600 ml-2">{e.detail}</span>
                </span>
                <span className="text-red-600 text-xs font-medium">{formatDate(e.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {thisWeek.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <h2 className="font-semibold text-yellow-700 mb-2">⚠️ สัปดาห์นี้ ({thisWeek.length} รายการ)</h2>
          <div className="space-y-1">
            {thisWeek.map((e, i) => {
              const days = daysFromNow(e.date);
              return (
                <div key={i} className="text-sm flex justify-between items-center">
                  <span>
                    <span className="font-medium text-yellow-700">{e.cattleId}</span>
                    <span className="text-gray-600 ml-2">{e.detail}</span>
                  </span>
                  <span className="text-yellow-600 text-xs font-medium">
                    {days === 0 ? 'วันนี้!' : `อีก ${days} วัน`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">เดือน:</label>
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => { setFilterMonth(e.target.value); setShowAll(false); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
        />
        <button
          onClick={() => setShowAll(!showAll)}
          className={`text-sm px-3 py-2 rounded-xl transition-colors ${showAll ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          ทั้งหมด
        </button>
      </div>

      {/* Events list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">📅</div>
          <p>ไม่มีนัดวัคซีนในช่วงนี้</p>
          <p className="text-xs mt-2">เพิ่มวันนัดครั้งต่อไปในหน้าประวัติวัว</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e, i) => {
            const days = daysFromNow(e.date);
            const isOverdue = days < 0;
            const isToday = days === 0;
            const isSoon = days > 0 && days <= 7;
            return (
              <Link
                key={i}
                href={`/cattle/${e.cattleId}`}
                className={`block bg-white rounded-xl p-4 shadow-sm border transition-colors hover:border-green-300 ${
                  isOverdue ? 'border-red-200' : isSoon ? 'border-yellow-200' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{e.cowGender === 'เมีย' ? '🐄' : '🐂'}</span>
                    <div>
                      <div className="font-semibold text-green-800">{e.cattleId}</div>
                      <div className="text-sm text-gray-600">{e.detail}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">{formatDate(e.date)}</div>
                    <div className={`text-xs font-medium mt-0.5 ${
                      isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : isSoon ? 'text-yellow-600' : 'text-gray-500'
                    }`}>
                      {isOverdue ? `เกิน ${Math.abs(days)} วัน` : isToday ? 'วันนี้!' : `อีก ${days} วัน`}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Standard schedule hint */}
      <div className="bg-blue-50 rounded-2xl p-4 text-sm">
        <h3 className="font-semibold text-blue-700 mb-2">📋 ปฏิทินวัคซีนมาตรฐาน</h3>
        <div className="space-y-1 text-gray-600 text-xs">
          <div>• <strong>FMD (ปากและเท้าเปื่อย)</strong> — มีนาคม & กันยายน (ทุก 6 เดือน)</div>
          <div>• <strong>LSD (ลัมปีสกิน)</strong> — พฤษภาคม (ปีละครั้ง)</div>
          <div>• <strong>คอบวม</strong> — เมษายน (ตามสถานการณ์)</div>
          <div>• <strong>ถ่ายพยาธิ</strong> — พฤษภาคม & พฤศจิกายน</div>
        </div>
      </div>
    </div>
  );
}
