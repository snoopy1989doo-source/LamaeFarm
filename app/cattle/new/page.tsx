'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveCattle, generateNextCattleId, generateId, getSettings } from '@/lib/storage';
import { Cattle, CattleGender, CattleStatus } from '@/types';

export default function NewCattlePage() {
  const router = useRouter();
  const nextId = generateNextCattleId();

  const [form, setForm] = useState({
    id: nextId,
    breed: 'ไทยบราห์มัน',
    gender: 'เมีย' as CattleGender,
    status: 'ในฟาร์ม' as CattleStatus,
    dateEntry: new Date().toISOString().slice(0, 10),
    buyPrice: '',
    source: '',
    notes: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cattle: Cattle = {
      id: form.id.trim(),
      breed: form.breed,
      gender: form.gender,
      status: form.status,
      dateEntry: form.dateEntry,
      buyPrice: Number(form.buyPrice) || 0,
      source: form.source,
      notes: form.notes,
      healthRecords: [],
      weightRecords: [],
      breedingRecords: [],
    };
    saveCattle(cattle);
    router.push(`/cattle/${cattle.id}`);
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-green-800">🐂 เพิ่มวัวใหม่</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสวัว</label>
            <input
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 font-mono"
              placeholder="เช่น D-001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สายพันธุ์</label>
            <input
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
              placeholder="เช่น ไทยบราห์มัน"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as CattleGender })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
              >
                <option value="เมีย">🐄 เมีย</option>
                <option value="ผู้">🐂 ผู้</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as CattleStatus })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
              >
                <option value="ในฟาร์ม">ในฟาร์ม</option>
                <option value="ป่วย">ป่วย</option>
                <option value="รอขาย">รอขาย</option>
                <option value="ขายแล้ว">ขายแล้ว</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เข้าฟาร์ม</label>
              <input
                type="date"
                value={form.dateEntry}
                onChange={(e) => setForm({ ...form, dateEntry: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ราคาซื้อ (บาท)</label>
              <input
                type="number"
                value={form.buyPrice}
                onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">แหล่งที่มา</label>
            <input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
              placeholder="เช่น ตลาดนัดโคชุมพร, นายฮ้อย..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
              rows={3}
              placeholder="บันทึกเพิ่มเติม..."
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-3.5 rounded-2xl font-semibold text-base hover:bg-green-700 transition-colors shadow-sm"
        >
          บันทึกวัว {form.id}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-medium text-sm hover:bg-gray-200 transition-colors"
        >
          ยกเลิก
        </button>
      </form>
    </div>
  );
}
