'use client';

import { useState, useEffect } from 'react';
import { getSettings, saveSettings, exportData, importData } from '@/lib/storage';
import { AppSettings } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { role, logout } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    ownerPin: '1234',
    workerPin: '0000',
    defaultPricePerKg: 95,
    farmName: 'ละแมฟาร์ม',
  });
  const [saved, setSaved] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (settings.ownerPin.length !== 4 || !/^\d{4}$/.test(settings.ownerPin)) {
      alert('PIN เจ้าของต้องเป็นตัวเลข 4 หลัก');
      return;
    }
    if (settings.workerPin.length !== 4 || !/^\d{4}$/.test(settings.workerPin)) {
      alert('PIN คนดูแลต้องเป็นตัวเลข 4 หลัก');
      return;
    }
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleExport() {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lamaefarm_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const ok = importData(text);
      if (ok) {
        setImportSuccess(true);
        setImportError('');
        setSettings(getSettings());
        setTimeout(() => setImportSuccess(false), 3000);
      } else {
        setImportError('ไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์ backup ที่ export จากแอปนี้');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-green-800">⚙️ ตั้งค่า</h1>

      {/* Farm info + PIN — owner only */}
      {role === 'owner' ? (
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-gray-800">ข้อมูลฟาร์มและ PIN</h2>

          <div>
            <label className="block text-xs text-gray-500 mb-1">ชื่อฟาร์ม</label>
            <input
              value={settings.farmName}
              onChange={(e) => setSettings({ ...settings, farmName: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">ราคาวัวต่อกก. ตั้งต้น (บาท)</label>
            <input
              type="number"
              value={settings.defaultPricePerKg}
              onChange={(e) => setSettings({ ...settings, defaultPricePerKg: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
              min="1"
            />
            <p className="text-xs text-gray-400 mt-1">ใช้คำนวณราคาขายวัวโดยประมาณ</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">👑 PIN เจ้าของ (4 หลัก)</label>
              <input
                type="password"
                value={settings.ownerPin}
                onChange={(e) => setSettings({ ...settings, ownerPin: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 font-mono tracking-widest"
                maxLength={4}
                inputMode="numeric"
                pattern="\d{4}"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">👷 PIN คนดูแลวัว (4 หลัก)</label>
              <input
                type="password"
                value={settings.workerPin}
                onChange={(e) => setSettings({ ...settings, workerPin: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 font-mono tracking-widest"
                maxLength={4}
                inputMode="numeric"
                pattern="\d{4}"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-3 rounded-2xl font-semibold transition-colors ${
              saved ? 'bg-green-500 text-white' : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {saved ? '✅ บันทึกแล้ว!' : 'บันทึกการตั้งค่า'}
          </button>
        </form>
      ) : (
        <div className="bg-yellow-50 rounded-2xl p-5 border border-yellow-200 text-sm text-yellow-700">
          ⚠️ คุณใช้งานในโหมด "คนดูแลวัว" — ไม่สามารถแก้ไขการตั้งค่าได้<br />
          ติดต่อเจ้าของฟาร์มเพื่อเปลี่ยน PIN หรือการตั้งค่า
        </div>
      )}

      {/* Backup / Restore — owner only */}
      {role === 'owner' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-800">💾 สำรองและกู้คืนข้อมูล</h2>
          <p className="text-xs text-gray-500">
            ข้อมูลเก็บใน localStorage ของเครื่องนี้ ควร Export สำรองไว้เสมอ
            และใช้ Import เพื่อย้ายข้อมูลไปยังเครื่องอื่น
          </p>

          <button
            onClick={handleExport}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            📤 Export ข้อมูล (JSON)
          </button>

          <div>
            <label className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors cursor-pointer">
              📥 Import ข้อมูล (JSON)
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            {importError && <p className="text-red-500 text-xs mt-2">{importError}</p>}
            {importSuccess && <p className="text-green-600 text-xs mt-2">✅ นำเข้าข้อมูลสำเร็จ!</p>}
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full bg-red-50 text-red-500 py-3 rounded-2xl font-semibold hover:bg-red-100 transition-colors border border-red-200"
      >
        🚪 ออกจากระบบ
      </button>

      <div className="text-center text-xs text-gray-400 pb-4">
        ละแมฟาร์ม v1.0 · บ้านดวด อ.ละแม จ.ชุมพร
      </div>
    </div>
  );
}
