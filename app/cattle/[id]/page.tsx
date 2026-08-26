'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCattleById, saveCattle, generateId, getSettings } from '@/lib/storage';
import { estimateWeight, estimateSalePrice, weightCategory } from '@/lib/weight';
import { Cattle, HealthRecord, WeightRecord, BreedingRecord, CattleStatus } from '@/types';

const STATUS_COLOR: Record<CattleStatus, string> = {
  ในฟาร์ม: 'bg-green-100 text-green-700',
  ป่วย: 'bg-red-100 text-red-700',
  รอขาย: 'bg-yellow-100 text-yellow-700',
  ขายแล้ว: 'bg-gray-100 text-gray-500',
};

function formatDate(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

type Tab = 'สุขภาพ' | 'น้ำหนัก' | 'ผสมพันธุ์' | 'ขาย';

export default function CattleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(params.id as string);

  const [cow, setCow] = useState<Cattle | null>(null);
  const [tab, setTab] = useState<Tab>('สุขภาพ');
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showBreedForm, setShowBreedForm] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);

  // Health form
  const [hForm, setHForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'วัคซีน' as HealthRecord['type'],
    detail: '',
    dose: '',
    operator: '',
    nextDueDate: '',
  });
  const [scheduleTemplate, setScheduleTemplate] = useState('none');

  // Auto-schedule effect
  useEffect(() => {
    if (!hForm.date) return;
    const baseDate = new Date(hForm.date);
    if (scheduleTemplate === '6months') {
      baseDate.setMonth(baseDate.getMonth() + 6);
      setHForm(prev => ({ ...prev, nextDueDate: baseDate.toISOString().slice(0, 10) }));
    } else if (scheduleTemplate === '12months') {
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      setHForm(prev => ({ ...prev, nextDueDate: baseDate.toISOString().slice(0, 10) }));
    } else if (scheduleTemplate === 'none') {
      setHForm(prev => ({ ...prev, nextDueDate: '' }));
    }
  }, [hForm.date, scheduleTemplate]);

  // Weight form
  const [wForm, setWForm] = useState({ date: new Date().toISOString().slice(0, 10), chestCm: '', bodyLengthCm: '' });
  const [settings] = useState(getSettings());
  const wEstimate = wForm.chestCm ? estimateWeight(Number(wForm.chestCm), Number(wForm.bodyLengthCm) || undefined) : 0;
  const wPrice = wEstimate ? estimateSalePrice(wEstimate, settings.defaultPricePerKg) : 0;

  // Breed form
  const [bForm, setBForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    method: 'ผสมเทียม' as BreedingRecord['method'],
    sireId: '',
    result: 'รอผล' as BreedingRecord['result'],
    notes: '',
  });

  // Sale form
  const [sForm, setSForm] = useState({ date: new Date().toISOString().slice(0, 10), buyerName: '', saleWeight: '', pricePerKg: String(settings.defaultPricePerKg), notes: '' });
  const sTotal = sForm.saleWeight && sForm.pricePerKg ? Number(sForm.saleWeight) * Number(sForm.pricePerKg) : 0;
  const sProfit = cow ? sTotal - cow.buyPrice : 0;

  function load() {
    const found = getCattleById(id);
    if (!found) { router.push('/cattle'); return; }
    setCow(found);
  }

  useEffect(() => { load(); }, [id]);

  if (!cow) return <div className="text-center py-20 text-gray-400">กำลังโหลด...</div>;

  function saveHealth(e: React.FormEvent) {
    e.preventDefault();
    if (!cow) return;
    const record: HealthRecord = { id: generateId(), ...hForm };
    const updated = { ...cow, healthRecords: [record, ...cow.healthRecords] };
    saveCattle(updated);
    setShowHealthForm(false);
    setHForm({ date: new Date().toISOString().slice(0, 10), type: 'วัคซีน', detail: '', dose: '', operator: '', nextDueDate: '' });
    load();
  }

  function saveWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!cow) return;
    const record: WeightRecord = {
      id: generateId(),
      date: wForm.date,
      chestCircumference: Number(wForm.chestCm),
      bodyLength: wForm.bodyLengthCm ? Number(wForm.bodyLengthCm) : undefined,
      estimatedWeight: wEstimate,
      pricePerKg: settings.defaultPricePerKg,
      estimatedPrice: wPrice,
    };
    const updated = { ...cow, weightRecords: [record, ...cow.weightRecords] };
    saveCattle(updated);
    setShowWeightForm(false);
    setWForm({ date: new Date().toISOString().slice(0, 10), chestCm: '', bodyLengthCm: '' });
    load();
  }

  function saveBreeding(e: React.FormEvent) {
    e.preventDefault();
    if (!cow) return;
    const expectedCalvingDate = new Date(bForm.date);
    expectedCalvingDate.setDate(expectedCalvingDate.getDate() + 280);
    const record: BreedingRecord = {
      id: generateId(),
      date: bForm.date,
      method: bForm.method,
      sireId: bForm.sireId,
      result: bForm.result,
      notes: bForm.notes,
      expectedCalvingDate: bForm.result === 'ตั้งท้อง' ? expectedCalvingDate.toISOString().slice(0, 10) : undefined,
    };
    const updated = { ...cow, breedingRecords: [record, ...cow.breedingRecords] };
    saveCattle(updated);
    setShowBreedForm(false);
    load();
  }

  function saveSale(e: React.FormEvent) {
    e.preventDefault();
    if (!cow) return;
    const updated: Cattle = {
      ...cow,
      status: 'ขายแล้ว',
      saleRecord: {
        date: sForm.date,
        buyerName: sForm.buyerName,
        saleWeight: Number(sForm.saleWeight) || undefined,
        pricePerKg: Number(sForm.pricePerKg) || undefined,
        totalPrice: sTotal,
        netProfit: sProfit,
        notes: sForm.notes,
      },
    };
    saveCattle(updated);
    setShowSaleForm(false);
    load();
  }

  function updateStatus(status: CattleStatus) {
    if (!cow) return;
    const updated = { ...cow, status };
    saveCattle(updated);
    load();
  }

  const latestWeight = cow.weightRecords[0];

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Back */}
      <Link href="/cattle" className="text-sm text-green-600 hover:underline">← กลับไปทะเบียนวัว</Link>

      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
        <div className="flex items-start gap-4">
          <span className="text-5xl">{cow.gender === 'เมีย' ? '🐄' : '🐂'}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-green-800">{cow.id}</h1>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLOR[cow.status]}`}>
                {cow.status}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{cow.breed} · {cow.gender}</p>
            {cow.dateEntry && <p className="text-gray-400 text-xs mt-0.5">เข้าฟาร์ม {formatDate(cow.dateEntry)}</p>}
            {cow.buyPrice > 0 && <p className="text-gray-400 text-xs">ราคาซื้อ {cow.buyPrice.toLocaleString('th-TH')} บาท</p>}
            {cow.source && <p className="text-gray-400 text-xs">แหล่งที่มา: {cow.source}</p>}

            {/* Quick status change */}
            {cow.status !== 'ขายแล้ว' && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {(['ในฟาร์ม', 'ป่วย', 'รอขาย'] as CattleStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={cow.status === s}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      cow.status === s
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-300 text-gray-500 hover:border-green-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Latest weight */}
        {latestWeight && (
          <div className="mt-4 bg-green-50 rounded-xl p-3 text-sm">
            <span className="text-green-700 font-medium">น้ำหนักล่าสุด:</span>{' '}
            <span className="font-bold text-green-800">{latestWeight.estimatedWeight} กก.</span>
            <span className="text-gray-500 ml-2">({weightCategory(latestWeight.estimatedWeight)})</span>
            {latestWeight.estimatedPrice && (
              <span className="text-yellow-700 ml-3">≈ {latestWeight.estimatedPrice.toLocaleString('th-TH')} บาท</span>
            )}
            <span className="text-gray-400 text-xs ml-3">{formatDate(latestWeight.date)}</span>
          </div>
        )}

        {cow.notes && <p className="mt-3 text-sm text-gray-500 italic">{cow.notes}</p>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {(['สุขภาพ', 'น้ำหนัก', 'ผสมพันธุ์', 'ขาย'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'สุขภาพ' && '💉 '}
            {t === 'น้ำหนัก' && '⚖️ '}
            {t === 'ผสมพันธุ์' && '🐮 '}
            {t === 'ขาย' && '💰 '}
            {t}
          </button>
        ))}
      </div>

      {/* ─── Health Tab ───────────────────────────────── */}
      {tab === 'สุขภาพ' && (
        <div className="space-y-3">
          <button
            onClick={() => setShowHealthForm(!showHealthForm)}
            className="w-full bg-green-600 text-white py-3 rounded-2xl font-semibold hover:bg-green-700 transition-colors"
          >
            + บันทึกสุขภาพ/วัคซีน
          </button>

          {showHealthForm && (
            <form onSubmit={saveHealth} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-800">บันทึกสุขภาพ</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">วันที่</label>
                  <input type="date" value={hForm.date} onChange={(e) => setHForm({ ...hForm, date: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ประเภท</label>
                  <select value={hForm.type} onChange={(e) => setHForm({ ...hForm, type: e.target.value as HealthRecord['type'] })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400">
                    <option>วัคซีน</option>
                    <option>ถ่ายพยาธิ</option>
                    <option>รักษาโรค</option>
                    <option>อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">รายละเอียด *</label>
                <input value={hForm.detail} onChange={(e) => setHForm({ ...hForm, detail: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                  placeholder="เช่น วัคซีน FMD เข็มที่ 1, Ivermectin 5ml" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">โดส/ปริมาณ</label>
                  <input value={hForm.dose} onChange={(e) => setHForm({ ...hForm, dose: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                    placeholder="เช่น 2 ml" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ผู้ดำเนินการ</label>
                  <input value={hForm.operator} onChange={(e) => setHForm({ ...hForm, operator: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                    placeholder="เช่น ปศุสัตว์, เจ้าของ" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">📅 รอบนัดหมายครั้งต่อไป</label>
                  <select
                    value={scheduleTemplate}
                    onChange={(e) => setScheduleTemplate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                  >
                    <option value="none">ไม่นัดหมาย</option>
                    <option value="6months">อีก 6 เดือน (ถ่ายพยาธิ / FMD)</option>
                    <option value="12months">อีก 1 ปี (LSD / คอบวม)</option>
                    <option value="custom">กำหนดวันเอง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">วันนัดครั้งต่อไป</label>
                  <input
                    type="date"
                    value={hForm.nextDueDate}
                    onChange={(e) => {
                      setHForm({ ...hForm, nextDueDate: e.target.value });
                      setScheduleTemplate('custom');
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700">บันทึก</button>
                <button type="button" onClick={() => setShowHealthForm(false)} className="px-4 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200">ยกเลิก</button>
              </div>
            </form>
          )}

          {cow.healthRecords.length === 0 ? (
            <div className="text-center py-10 text-gray-400">ยังไม่มีประวัติสุขภาพ</div>
          ) : (
            <div className="space-y-2">
              {cow.healthRecords.map((hr) => (
                <div key={hr.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{hr.type}</span>
                      <p className="font-medium text-gray-800 mt-1">{hr.detail}</p>
                      {hr.dose && <p className="text-xs text-gray-500">โดส: {hr.dose}</p>}
                      {hr.operator && <p className="text-xs text-gray-500">โดย: {hr.operator}</p>}
                      {hr.nextDueDate && (
                        <p className="text-xs text-yellow-600 mt-1">📅 นัดถัดไป: {formatDate(hr.nextDueDate)}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(hr.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Weight Tab ───────────────────────────────── */}
      {tab === 'น้ำหนัก' && (
        <div className="space-y-3">
          <button
            onClick={() => setShowWeightForm(!showWeightForm)}
            className="w-full bg-green-600 text-white py-3 rounded-2xl font-semibold hover:bg-green-700 transition-colors"
          >
            + บันทึกน้ำหนัก/รอบอก
          </button>

          {showWeightForm && (
            <form onSubmit={saveWeight} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-800">⚖️ คำนวณน้ำหนักจากรอบอก</h3>

              <div>
                <label className="block text-xs text-gray-500 mb-1">วันที่</label>
                <input type="date" value={wForm.date} onChange={(e) => setWForm({ ...wForm, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">รอบอก (ซม.) *</label>
                  <input type="number" value={wForm.chestCm} onChange={(e) => setWForm({ ...wForm, chestCm: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                    placeholder="เช่น 155" required min="50" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ความยาวลำตัว (ซม.)</label>
                  <input type="number" value={wForm.bodyLengthCm} onChange={(e) => setWForm({ ...wForm, bodyLengthCm: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                    placeholder="ถ้ามี (แม่นยำขึ้น)" min="50" />
                </div>
              </div>

              {/* Live preview */}
              {wEstimate > 0 && (
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">{wEstimate} กก.</div>
                  <div className="text-sm text-gray-500">{weightCategory(wEstimate)}</div>
                  <div className="text-yellow-700 font-semibold mt-1">
                    ≈ {wPrice.toLocaleString('th-TH')} บาท
                    <span className="text-xs text-gray-400 ml-1">({settings.defaultPricePerKg} บ./กก.)</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" disabled={!wEstimate} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50">บันทึก</button>
                <button type="button" onClick={() => setShowWeightForm(false)} className="px-4 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200">ยกเลิก</button>
              </div>
            </form>
          )}

          {cow.weightRecords.length === 0 ? (
            <div className="text-center py-10 text-gray-400">ยังไม่มีบันทึกน้ำหนัก</div>
          ) : (
            <div className="space-y-2">
              {cow.weightRecords.map((wr, i) => (
                <div key={wr.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-green-700 text-lg">{wr.estimatedWeight} กก.</div>
                    <div className="text-xs text-gray-500">รอบอก {wr.chestCircumference} ซม.{wr.bodyLength ? ` · ยาว ${wr.bodyLength} ซม.` : ''}</div>
                    {wr.estimatedPrice && (
                      <div className="text-xs text-yellow-600">≈ {wr.estimatedPrice.toLocaleString('th-TH')} บาท</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">{formatDate(wr.date)}</div>
                    {i === 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">ล่าสุด</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Breeding Tab ─────────────────────────────── */}
      {tab === 'ผสมพันธุ์' && (
        <div className="space-y-3">
          {cow.gender === 'เมีย' ? (
            <>
              <button
                onClick={() => setShowBreedForm(!showBreedForm)}
                className="w-full bg-green-600 text-white py-3 rounded-2xl font-semibold hover:bg-green-700 transition-colors"
              >
                + บันทึกการผสมพันธุ์
              </button>

              {showBreedForm && (
                <form onSubmit={saveBreeding} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">วันที่ผสม</label>
                      <input type="date" value={bForm.date} onChange={(e) => setBForm({ ...bForm, date: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">วิธีผสม</label>
                      <select value={bForm.method} onChange={(e) => setBForm({ ...bForm, method: e.target.value as BreedingRecord['method'] })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400">
                        <option>ผสมเทียม</option>
                        <option>ผสมธรรมชาติ</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">รหัสพ่อพันธุ์</label>
                      <input value={bForm.sireId} onChange={(e) => setBForm({ ...bForm, sireId: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                        placeholder="เช่น D-003" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">ผลลัพธ์</label>
                      <select value={bForm.result} onChange={(e) => setBForm({ ...bForm, result: e.target.value as BreedingRecord['result'] })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400">
                        <option>รอผล</option>
                        <option>ตั้งท้อง</option>
                        <option>ไม่ตั้งท้อง</option>
                        <option>คลอดแล้ว</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">หมายเหตุ</label>
                    <textarea value={bForm.notes} onChange={(e) => setBForm({ ...bForm, notes: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700">บันทึก</button>
                    <button type="button" onClick={() => setShowBreedForm(false)} className="px-4 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200">ยกเลิก</button>
                  </div>
                </form>
              )}

              {cow.breedingRecords.length === 0 ? (
                <div className="text-center py-10 text-gray-400">ยังไม่มีประวัติการผสมพันธุ์</div>
              ) : (
                <div className="space-y-2">
                  {cow.breedingRecords.map((br) => (
                    <div key={br.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{br.method}</span>
                          {br.sireId && <span className="text-xs text-gray-500 ml-2">พ่อพันธุ์: {br.sireId}</span>}
                          <div className="mt-1 font-medium">
                            {br.result === 'ตั้งท้อง' && '🤰 '}
                            {br.result === 'คลอดแล้ว' && '🐮 '}
                            {br.result === 'ไม่ตั้งท้อง' && '❌ '}
                            {br.result === 'รอผล' && '⏳ '}
                            {br.result}
                          </div>
                          {br.expectedCalvingDate && (
                            <p className="text-xs text-green-600 mt-0.5">วันคลอดโดยประมาณ: {formatDate(br.expectedCalvingDate)}</p>
                          )}
                          {br.notes && <p className="text-xs text-gray-500 mt-1">{br.notes}</p>}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(br.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <p>วัวผู้ไม่มีบันทึกผสมพันธุ์ในระบบนี้</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Sale Tab ─────────────────────────────────── */}
      {tab === 'ขาย' && (
        <div className="space-y-3">
          {cow.status === 'ขายแล้ว' && cow.saleRecord ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">✅ บันทึกการขาย</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">วันที่ขาย</span><span>{formatDate(cow.saleRecord.date)}</span></div>
                {cow.saleRecord.buyerName && <div className="flex justify-between"><span className="text-gray-500">ผู้ซื้อ</span><span>{cow.saleRecord.buyerName}</span></div>}
                {cow.saleRecord.saleWeight && <div className="flex justify-between"><span className="text-gray-500">น้ำหนักขาย</span><span>{cow.saleRecord.saleWeight} กก.</span></div>}
                {cow.saleRecord.pricePerKg && <div className="flex justify-between"><span className="text-gray-500">ราคา/กก.</span><span>{cow.saleRecord.pricePerKg} บาท</span></div>}
                <div className="flex justify-between font-semibold border-t pt-2 mt-2"><span>ราคาขายได้</span><span className="text-green-700">{cow.saleRecord.totalPrice.toLocaleString('th-TH')} บาท</span></div>
                <div className="flex justify-between font-semibold"><span>กำไรสุทธิ</span>
                  <span className={cow.saleRecord.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}>
                    {cow.saleRecord.netProfit >= 0 ? '+' : ''}{cow.saleRecord.netProfit.toLocaleString('th-TH')} บาท
                  </span>
                </div>
                {cow.saleRecord.notes && <p className="text-gray-500 text-xs mt-2">{cow.saleRecord.notes}</p>}
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowSaleForm(!showSaleForm)}
                className="w-full bg-yellow-500 text-white py-3 rounded-2xl font-semibold hover:bg-yellow-600 transition-colors"
              >
                💰 บันทึกการขาย
              </button>

              {showSaleForm && (
                <form onSubmit={saveSale} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
                  <h3 className="font-semibold text-gray-800">บันทึกการขาย {cow.id}</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">วันที่ขาย</label>
                      <input type="date" value={sForm.date} onChange={(e) => setSForm({ ...sForm, date: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">ชื่อผู้ซื้อ</label>
                      <input value={sForm.buyerName} onChange={(e) => setSForm({ ...sForm, buyerName: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                        placeholder="เช่น นายฮ้อยสมชาย" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">น้ำหนักขาย (กก.)</label>
                      <input type="number" value={sForm.saleWeight} onChange={(e) => setSForm({ ...sForm, saleWeight: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                        placeholder="กก." min="0" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">ราคา/กก. (บาท)</label>
                      <input type="number" value={sForm.pricePerKg} onChange={(e) => setSForm({ ...sForm, pricePerKg: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                        min="0" />
                    </div>
                  </div>

                  {sTotal > 0 && (
                    <div className="bg-yellow-50 rounded-xl p-3 text-sm">
                      <div className="flex justify-between"><span>ราคาขายรวม</span><span className="font-bold text-green-700">{sTotal.toLocaleString('th-TH')} บาท</span></div>
                      <div className="flex justify-between mt-1">
                        <span>กำไร/ขาดทุน</span>
                        <span className={`font-bold ${sProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {sProfit >= 0 ? '+' : ''}{sProfit.toLocaleString('th-TH')} บาท
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">หมายเหตุ</label>
                    <textarea value={sForm.notes} onChange={(e) => setSForm({ ...sForm, notes: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" rows={2} />
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-yellow-500 text-white py-2.5 rounded-xl font-semibold hover:bg-yellow-600">ยืนยันการขาย</button>
                    <button type="button" onClick={() => setShowSaleForm(false)} className="px-4 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200">ยกเลิก</button>
                  </div>
                </form>
              )}

              {!showSaleForm && (
                <div className="text-center py-6 text-gray-400 text-sm">ยังไม่มีการขาย</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
