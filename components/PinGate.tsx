'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export function PinGate({ children }: { children: React.ReactNode }) {
  const { role, login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (role) return <>{children}</>;

  function handlePinButton(digit: string) {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length === 4) {
      const result = login(newPin);
      if (result === 'wrong') {
        setError('PIN ไม่ถูกต้อง ลองใหม่อีกครั้ง');
        setTimeout(() => setPin(''), 500);
      }
    }
  }

  function handleClear() {
    setPin('');
    setError('');
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="text-6xl mb-3">🐂</div>
        <h1 className="text-2xl font-bold text-green-800 mb-1">ละแมฟาร์ม</h1>
        <p className="text-gray-500 text-sm mb-6">กรอก PIN เพื่อเข้าใช้งาน</p>

        {/* PIN dots */}
        <div className="flex justify-center gap-5 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > i
                  ? 'bg-green-600 border-green-600 scale-110'
                  : 'bg-white border-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {keys.map((d, i) => (
            <button
              key={i}
              onClick={() => {
                if (d === '⌫') handleClear();
                else if (d !== '') handlePinButton(d);
              }}
              disabled={d === ''}
              className={`py-4 rounded-2xl text-xl font-semibold transition-all active:scale-90 ${
                d === ''
                  ? 'invisible'
                  : d === '⌫'
                  ? 'bg-red-50 text-red-400 hover:bg-red-100'
                  : 'bg-gray-100 text-gray-800 hover:bg-green-100'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}

      </div>
    </div>
  );
}
