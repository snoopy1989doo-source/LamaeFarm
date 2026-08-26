'use client';

import { useEffect, useState } from 'react';
import { getFinance, saveFinanceRecord, deleteFinanceRecord, getFinanceSummary, generateId } from '@/lib/storage';
import { FinanceRecord, FinanceCategory, FinanceType } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const INCOME_CATEGORIES: FinanceCategory[] = ['รายได้จากขายวัว', 'อื่นๆ'];
const EXPENSE_CATEGORIES: FinanceCategory[] = ['ยารักษาโรค', 'วัคซีน', 'หญ้า/อาหาร', 'ค่าขนส่ง', 'ค่าแรง', 'อุปกรณ์ฟาร์ม', 'อื่นๆ'];

function formatBaht(n: number) {
  return n.toLocaleString('th-TH') + ' บาท';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FinancePage() {
  const { role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role !== 'owner') router.push('/');
  }, [role]);

  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'รายจ่าย' as FinanceType,
    category: 'หญ้า/อาหาร' as FinanceCategory,
    amount: '',
    cattleId: '',
    notes: '',
  });

  function load() {
    setRecords(getFinance());
  }

  useEffect(() => { load(); }, []);

  const filtered = records
    .filter((r) => !filterMonth || r.date.startsWith(filterMonth))
    .sort((a, b) => b.date.localeCompare(a.date));

  const summary = getFinanceSummary(filterMonth);

  const categories = form.type === 'รายรับ' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function handleTypeChange(t: FinanceType) {
    const defaultCat = t === 'รายรับ' ? 'รายได้จากขายวัว' : 'หญ้า/อาหาร';
    setForm({ ...form, type: t, category: defaultCat });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const record: FinanceRecord = {
      id: generateId(),
      date: form.date,
      type: form.type,
      category: form.category,
      amount: Number(form.amount),
      cattleId: form.cattleId || undefined,
      notes: form.notes || undefined,
    };
    saveFinanceRecord(record);
    setShowForm(false);
    setForm({ date: new Date().toISOString().slice(0, 10), type: 'รายจ่าย', category: 'หญ้า/อาหาร', amount: '', cattleId: '', notes: '' });
    load();
  }

  function handleDelete(id: string) {
    if (!confirm('ต้องการลบรายการนี้?')) return;
    deleteFinanceRecord(id);
    load();
  }

  if (role !== 'owner') return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-green-800">💰 บัญชีรายรับ-รายจ่าย</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          + บันทึก
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">เดือน:</label>
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
        />
        <button
          onClick={() => setFilterMonth('')}
          className={`text-sm px-3 py-2 rounded-xl transition-colors ${!filterMonth ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          ทั้งหมด
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
          <div className="text-xs text-gray-500 mb-1">รายรับ</div>
          <div className="font-bold text-green-700 text-lg">{summary.totalIncome.toLocaleString('th-TH')}</div>
          <div className="text-xs text-gray-400">บาท</div>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 text-center border border-red-100">
          <div className="text-xs text-gray-500 mb-1">รายจ่าย</div>
          <div className="font-bold text-red-600 text-lg">{summary.totalExpense.toLocaleString('th-TH')}</div>
          <div className="text-xs text-gray-400">บาท</div>
        </div>
        <div className={`rounded-2xl p-4 text-center border ${summary.netProfit >= 0 ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'}`}>
          <div className="text-xs text-gray-500 mb-1">กำไร/ขาดทุน</div>
          <div className={`font-bold text-lg ${summary.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {summary.netProfit >= 0 ? '+' : ''}{summary.netProfit.toLocaleString('th-TH')}
          </div>
          <div className="text-xs text-gray-400">บาท</div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold text-gray-800">บันทึกรายการ</h3>

          {/* Income / Expense toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['รายจ่าย', 'รายรับ'] as FinanceType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  form.type === t
                    ? t === 'รายรับ' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t === 'รายรับ' ? '+ รายรับ' : '- รายจ่าย'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">วันที่</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">หมวดหมู่</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as FinanceCategory })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">จำนวนเงิน (บาท) *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                placeholder="0" min="1" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">เชื่อมกับวัว (optional)</label>
              <input value={form.cattleId} onChange={(e) => setForm({ ...form, cattleId: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                placeholder="เช่น D-001" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">หมายเหตุ</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              placeholder="รายละเอียดเพิ่มเติม" />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700">บันทึก</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200">ยกเลิก</button>
          </div>
        </form>
      )}

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">💰</div>
          <p>ยังไม่มีรายการ</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className={`text-2xl ${r.type === 'รายรับ' ? '💚' : '🔴'}`}>
                {r.type === 'รายรับ' ? '💚' : '🔴'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{r.category}</span>
                  {r.cattleId && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{r.cattleId}</span>}
                </div>
                {r.notes && <p className="text-xs text-gray-500 truncate">{r.notes}</p>}
                <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
              </div>
              <div className="text-right">
                <div className={`font-bold ${r.type === 'รายรับ' ? 'text-green-700' : 'text-red-600'}`}>
                  {r.type === 'รายรับ' ? '+' : '-'}{r.amount.toLocaleString('th-TH')}
                </div>
                <button onClick={() => handleDelete(r.id)} className="text-xs text-gray-300 hover:text-red-400 mt-1">ลบ</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
