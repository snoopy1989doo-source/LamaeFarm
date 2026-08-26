'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCattle, deleteCattle } from '@/lib/storage';
import { Cattle, CattleStatus } from '@/types';

const STATUS_COLOR: Record<CattleStatus, string> = {
  ในฟาร์ม: 'bg-green-100 text-green-700',
  ป่วย: 'bg-red-100 text-red-700',
  รอขาย: 'bg-yellow-100 text-yellow-700',
  ขายแล้ว: 'bg-gray-100 text-gray-500',
};

const ALL_STATUSES: (CattleStatus | 'ทั้งหมด')[] = ['ทั้งหมด', 'ในฟาร์ม', 'ป่วย', 'รอขาย', 'ขายแล้ว'];

export default function CattlePage() {
  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [filter, setFilter] = useState<CattleStatus | 'ทั้งหมด'>('ทั้งหมด');
  const [search, setSearch] = useState('');

  function load() {
    setCattle(getCattle());
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = cattle.filter((c) => {
    const matchStatus = filter === 'ทั้งหมด' || c.status === filter;
    const matchSearch =
      search === '' ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.breed.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  function handleDelete(id: string) {
    if (!confirm(`ต้องการลบ ${id} ออกจากระบบ?`)) return;
    deleteCattle(id);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-green-800">🐂 ทะเบียนวัว</h1>
        <Link
          href="/cattle/new"
          className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          + เพิ่มวัว
        </Link>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="ค้นหา รหัส หรือ สายพันธุ์..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
      />

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              filter === s
                ? 'bg-green-600 text-white font-semibold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s} {s !== 'ทั้งหมด' && `(${cattle.filter((c) => c.status === s).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🐂</div>
          <p>ไม่พบข้อมูลวัว</p>
          <Link
            href="/cattle/new"
            className="mt-4 inline-block text-sm bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700"
          >
            + เพิ่มวัวตัวแรก
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((cow) => (
            <div
              key={cow.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4"
            >
              <span className="text-4xl">{cow.gender === 'เมีย' ? '🐄' : '🐂'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-800">{cow.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[cow.status]}`}>
                    {cow.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {cow.breed} · {cow.gender}
                  {cow.dateEntry && ` · เข้า ${new Date(cow.dateEntry).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </div>
                {cow.buyPrice > 0 && (
                  <div className="text-xs text-gray-400">ราคาซื้อ {cow.buyPrice.toLocaleString('th-TH')} บาท</div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href={`/cattle/${cow.id}`}
                  className="text-sm text-green-600 hover:text-green-800 font-medium"
                >
                  ดูรายละเอียด
                </Link>
                <button
                  onClick={() => handleDelete(cow.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
