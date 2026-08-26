'use client';

import { useEffect, useState } from 'react';
import { getFinance, saveFinanceRecord, deleteFinanceRecord, getFinanceSummary, generateId, sendLineNotify } from '@/lib/storage';
import { FinanceRecord, FinanceCategory, FinanceType } from '@/types';
import { useAuth } from '@/context/AuthContext';

const INCOME_CATEGORIES: FinanceCategory[] = ['รายได้จากขายวัว', 'อื่นๆ'];
const EXPENSE_CATEGORIES: FinanceCategory[] = ['ยารักษาโรค', 'วัคซีน', 'หญ้า/อาหาร', 'ค่าขนส่ง', 'ค่าแรง', 'อุปกรณ์ฟาร์ม', 'อื่นๆ'];

function formatBaht(n: number) {
  return n.toLocaleString('th-TH') + ' บาท';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function compressImage(file: File, callback: (base64: string) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400; // Resize to max 400px width
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Compress quality 60%
      callback(dataUrl);
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

export default function FinancePage() {
  const { role } = useAuth();
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [sendingLine, setSendingLine] = useState(false);

  // Form states
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'รายจ่าย' as FinanceType,
    category: 'หญ้า/อาหาร' as FinanceCategory,
    amount: '',
    cattleId: '',
    notes: '',
    image: '', // base64
  });

  // Rejection dialog state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Selected image preview
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function load() {
    setRecords(getFinance());
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = records
    .filter((r) => !filterMonth || r.date.startsWith(filterMonth))
    .sort((a, b) => b.date.localeCompare(a.date));

  const summary = getFinanceSummary(filterMonth);

  const categories = form.type === 'รายรับ' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function handleTypeChange(t: FinanceType) {
    const defaultCat = t === 'รายรับ' ? 'รายได้จากขายวัว' : 'หญ้า/อาหาร';
    setForm({ ...form, type: t, category: defaultCat });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, (base64) => {
      setForm((prev) => ({ ...prev, image: base64 }));
      setImagePreview(base64);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check if we are editing an existing rejected record
    const isNew = !editingRecord;
    const recordId = editingRecord ? editingRecord.id : generateId();

    const newRecord: FinanceRecord = {
      id: recordId,
      date: form.date,
      type: form.type,
      category: form.category,
      amount: Number(form.amount),
      cattleId: form.cattleId || undefined,
      notes: form.notes || undefined,
      status: role === 'owner' ? 'อนุมัติแล้ว' : 'รออนุมัติ',
      createdTimestamp: editingRecord?.createdTimestamp || new Date().toISOString(),
      image: form.image || undefined,
    };

    saveFinanceRecord(newRecord);
    setShowForm(false);
    setEditingRecord(null);
    setForm({ date: new Date().toISOString().slice(0, 10), type: 'รายจ่าย', category: 'หญ้า/อาหาร', amount: '', cattleId: '', notes: '', image: '' });
    setImagePreview(null);
    load();

    // If it's a worker adding/editing, send LINE Notify
    if (role === 'worker') {
      setSendingLine(true);
      const action = isNew ? 'บันทึกค่าใช้จ่ายใหม่' : 'แก้ไขและส่งรายการใหม่';
      const msg = `🚨 มีรายการค่าใช้จ่ายใหม่รออนุมัติ!\n` +
                  `-------------------------\n` +
                  `📌 ประเภท: ${newRecord.category}\n` +
                  `🐂 วัวรหัส: ${newRecord.cattleId || 'ไม่ระบุ'}\n` +
                  `💰 จำนวนเงิน: ${formatBaht(newRecord.amount)}\n` +
                  `📅 วันที่ระบุ: ${formatDate(newRecord.date)}\n` +
                  `📝 หมายเหตุ: ${newRecord.notes || '-'}\n` +
                  `👷 บันทึกโดย: คนดูแลวัว\n` +
                  `-------------------------\n` +
                  `(กรุณาเข้าสู่ระบบในฐานะเจ้าของเพื่อทำการอนุมัติ)`;

      await sendLineNotify(msg, newRecord.image);
      setSendingLine(false);
    }
  }

  function handleApprove(record: FinanceRecord) {
    const updated: FinanceRecord = {
      ...record,
      status: 'อนุมัติแล้ว',
    };
    saveFinanceRecord(updated);
    load();
  }

  function openRejectDialog(id: string) {
    setRejectingId(id);
    setRejectReason('');
  }

  function handleRejectSubmit() {
    if (!rejectingId) return;
    const record = records.find(r => r.id === rejectingId);
    if (!record) return;

    const updated: FinanceRecord = {
      ...record,
      status: 'ปฏิเสธ',
      rejectReason: rejectReason || 'ไม่ระบุสาเหตุ',
    };
    saveFinanceRecord(updated);
    setRejectingId(null);
    setRejectReason('');
    load();
  }

  function handleDelete(id: string) {
    if (!confirm('ต้องการลบรายการนี้?')) return;
    deleteFinanceRecord(id);
    load();
  }

  function handleEditRejected(record: FinanceRecord) {
    setEditingRecord(record);
    setForm({
      date: record.date,
      type: record.type,
      category: record.category,
      amount: String(record.amount),
      cattleId: record.cattleId || '',
      notes: record.notes || '',
      image: record.image || '',
    });
    setImagePreview(record.image || null);
    setShowForm(true);
  }

  const pendingCount = records.filter(r => r.status === 'รออนุมัติ').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-green-800">💰 บัญชีรายรับ-รายจ่าย</h1>
          <p className="text-xs text-gray-500">โหมด: {role === 'owner' ? '👑 เจ้าของฟาร์ม' : '👷 คนดูแลวัว'}</p>
        </div>
        <button
          onClick={() => {
            setEditingRecord(null);
            setForm({ date: new Date().toISOString().slice(0, 10), type: 'รายจ่าย', category: 'หญ้า/อาหาร', amount: '', cattleId: '', notes: '', image: '' });
            setImagePreview(null);
            setShowForm(!showForm);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          {showForm ? 'ปิดฟอร์ม' : '+ บันทึกรายการ'}
        </button>
      </div>

      {/* Summary cards — OWNER ONLY */}
      {role === 'owner' ? (
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
      ) : (
        <div className="bg-green-50 rounded-2xl p-4 border border-green-200 text-sm text-green-800">
          👷 คุณกำลังบันทึกข้อมูลในฐานะ **คนดูแลวัว** ทุกรายการค่าใช้จ่ายจะถูกส่งไปที่ LINE ของเจ้าของเพื่อขออนุมัติโดยอัตโนมัติ
        </div>
      )}

      {/* Month selector — OWNER ONLY */}
      {role === 'owner' && (
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
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-800 text-base border-b pb-2">
            {editingRecord ? '📝 แก้ไขรายการที่ถูกปฏิเสธ' : '📥 บันทึกรายการใหม่'}
          </h3>

          {/* Income / Expense toggle — OWNER ONLY (Worker can only submit Expense) */}
          {role === 'owner' ? (
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
          ) : (
            <div className="bg-red-50 text-red-600 font-semibold px-4 py-2.5 rounded-xl text-center text-sm">
              ประเภท: รายจ่าย
            </div>
          )}

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
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 font-bold"
                placeholder="0" min="1" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">เชื่อมกับรหัสวัว (ถ้ามี)</label>
              <input value={form.cattleId} onChange={(e) => setForm({ ...form, cattleId: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 font-mono"
                placeholder="เช่น D-001" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">รายละเอียด / หมายเหตุ</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              placeholder="รายละเอียดของบิล/ค่าใช้จ่าย" />
          </div>

          {/* Receipt Image upload */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">📷 แนบรูปหลักฐาน/ใบเสร็จ</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
            {imagePreview && (
              <div className="mt-2 relative inline-block">
                <img src={imagePreview} alt="Receipt preview" className="h-32 object-contain rounded-xl border border-gray-200" />
                <button
                  type="button"
                  onClick={() => { setForm({ ...form, image: '' }); setImagePreview(null); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sendingLine}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              {sendingLine ? 'กำลังส่งแจ้งเตือน LINE...' : (role === 'owner' ? 'บันทึก' : 'ส่งคำขออนุมัติ')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingRecord(null);
                setImagePreview(null);
              }}
              className="px-4 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {/* Reject dialog (Modal-like) */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-gray-800 text-lg">❌ ปฏิเสธรายการค่าใช้จ่าย</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">เหตุผลในการปฏิเสธ</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                rows={3}
                placeholder="ระบุเหตุผลเพื่อให้คนดูแลทำการแก้ไข..."
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim()}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50"
              >
                ยืนยันปฏิเสธ
              </button>
              <button
                onClick={() => setRejectingId(null)}
                className="px-4 bg-gray-100 text-gray-700 py-2 rounded-xl"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending approval section — OWNER ONLY */}
      {role === 'owner' && pendingCount > 0 && (
        <div className="bg-yellow-50 rounded-2xl p-5 border border-yellow-200 space-y-3">
          <h2 className="font-bold text-yellow-800 text-base">⏳ รายการรออนุมัติ ({pendingCount} รายการ)</h2>
          <div className="space-y-3">
            {records
              .filter((r) => r.status === 'รออนุมัติ')
              .map((r) => (
                <div key={r.id} className="bg-white rounded-xl p-4 border border-yellow-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">🟡</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{r.category}</span>
                        {r.cattleId && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-mono">{r.cattleId}</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">ระบุวันที่: {formatDate(r.date)}</p>
                      {r.notes && <p className="text-xs text-gray-600 italic">"{r.notes}"</p>}
                      <p className="text-xs text-gray-400 mt-1">ส่งเมื่อ: {new Date(r.createdTimestamp).toLocaleString('th-TH')}</p>

                      {/* Display attached image */}
                      {r.image && (
                        <div className="mt-2">
                          <a href={r.image} target="_blank" rel="noreferrer" className="inline-block">
                            <img src={r.image} alt="Receipt attachment" className="h-16 object-contain rounded border hover:scale-105 transition-transform" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-end md:justify-start">
                    <div className="text-right mr-2">
                      <div className="font-bold text-red-600 text-lg">-{r.amount.toLocaleString('th-TH')} บาท</div>
                    </div>
                    <button
                      onClick={() => handleApprove(r)}
                      className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 font-bold"
                    >
                      อนุมัติ ✅
                    </button>
                    <button
                      onClick={() => openRejectDialog(r.id)}
                      className="bg-red-50 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-100 font-bold border border-red-200"
                    >
                      ปฏิเสธ ❌
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* History Records */}
      <div>
        <h2 className="font-semibold text-green-800 mb-3">📋 ประวัติรายการ</h2>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl mb-3">💰</div>
            <p>ยังไม่มีรายการในเดือนนี้</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const isOwner = role === 'owner';
              const isPending = r.status === 'รออนุมัติ';
              const isApproved = !r.status || r.status === 'อนุมัติแล้ว';
              const isRejected = r.status === 'ปฏิเสธ';

              return (
                <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className={`text-2xl ${r.type === 'รายรับ' ? '💚' : (isPending ? '⏳' : isRejected ? '❌' : '🔴')}`}>
                    {r.type === 'รายรับ' ? '💚' : (isPending ? '⏳' : isRejected ? '❌' : '🔴')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{r.category}</span>
                      {r.cattleId && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-mono">{r.cattleId}</span>}
                    </div>
                    {r.notes && <p className="text-xs text-gray-500 truncate">{r.notes}</p>}
                    <p className="text-xs text-gray-400">{formatDate(r.date)}</p>

                    {/* Status badges for history */}
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {isPending && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">รออนุมัติ</span>}
                      {isRejected && (
                        <div className="w-full">
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">ถูกปฏิเสธ</span>
                          {r.rejectReason && <span className="text-[10px] text-red-500 ml-2 block">เหตุผล: {r.rejectReason}</span>}
                        </div>
                      )}
                    </div>

                    {/* Image thumb */}
                    {r.image && (
                      <div className="mt-2">
                        <a href={r.image} target="_blank" rel="noreferrer" className="inline-block">
                          <img src={r.image} alt="Receipt thumbnail" className="h-10 object-contain rounded border" />
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${r.type === 'รายรับ' ? 'text-green-700' : 'text-red-600'}`}>
                      {r.type === 'รายรับ' ? '+' : '-'}{r.amount.toLocaleString('th-TH')}
                    </div>

                    {/* Action buttons based on Role & Status */}
                    {isOwner ? (
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-gray-300 hover:text-red-400 mt-1 block ml-auto">ลบ</button>
                    ) : (
                      isRejected && (
                        <button
                          onClick={() => handleEditRejected(r)}
                          className="bg-yellow-500 text-white text-[10px] px-2.5 py-1 rounded-md hover:bg-yellow-600 font-semibold mt-1 inline-block"
                        >
                          แก้ไข/ส่งใหม่ ✏️
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
