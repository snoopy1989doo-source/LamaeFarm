import {
  AppData,
  Cattle,
  FinanceRecord,
  AppSettings,
} from '@/types';

const STORAGE_KEY = 'lamaefarm_data';

const DEFAULT_SETTINGS: AppSettings = {
  ownerPin: '1234',
  workerPin: '0000',
  defaultPricePerKg: 95,
  farmName: 'ละแมฟาร์ม',
};

const DEFAULT_DATA: AppData = {
  cattle: [],
  finance: [],
  settings: DEFAULT_SETTINGS,
  lastUpdated: new Date().toISOString(),
};

export function loadData(): AppData {
  if (typeof window === 'undefined') return DEFAULT_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw) as AppData;
    parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
    return parsed;
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  data.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getCattle(): Cattle[] {
  return loadData().cattle;
}

export function getCattleById(id: string): Cattle | undefined {
  return loadData().cattle.find((c) => c.id === id);
}

export function saveCattle(cattle: Cattle): void {
  const data = loadData();
  const idx = data.cattle.findIndex((c) => c.id === cattle.id);
  if (idx >= 0) {
    data.cattle[idx] = cattle;
  } else {
    data.cattle.push(cattle);
  }
  saveData(data);
}

export function deleteCattle(id: string): void {
  const data = loadData();
  data.cattle = data.cattle.filter((c) => c.id !== id);
  saveData(data);
}

export function generateNextCattleId(): string {
  const data = loadData();
  if (data.cattle.length === 0) return 'D-001';
  const nums = data.cattle
    .map((c) => parseInt(c.id.replace('D-', ''), 10))
    .filter((n) => !isNaN(n));
  const max = Math.max(...nums);
  return `D-${String(max + 1).padStart(3, '0')}`;
}

export function getFinance(): FinanceRecord[] {
  return loadData().finance;
}

export function saveFinanceRecord(record: FinanceRecord): void {
  const data = loadData();
  const idx = data.finance.findIndex((f) => f.id === record.id);
  if (idx >= 0) {
    data.finance[idx] = record;
  } else {
    data.finance.push(record);
  }
  saveData(data);
}

export function deleteFinanceRecord(id: string): void {
  const data = loadData();
  data.finance = data.finance.filter((f) => f.id !== id);
  saveData(data);
}

export function getSettings(): AppSettings {
  return loadData().settings;
}

export function saveSettings(settings: AppSettings): void {
  const data = loadData();
  data.settings = settings;
  saveData(data);
}

export function exportData(): string {
  return JSON.stringify(loadData(), null, 2);
}

export function importData(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr) as AppData;
    if (!parsed.cattle || !parsed.finance) return false;
    saveData(parsed);
    return true;
  } catch {
    return false;
  }
}

export function getFinanceSummary(month?: string) {
  let records = loadData().finance;
  if (month) {
    records = records.filter((r) => r.date.startsWith(month));
  }
  const totalIncome = records
    .filter((r) => r.type === 'รายรับ')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = records
    .filter((r) => r.type === 'รายจ่าย')
    .reduce((sum, r) => sum + r.amount, 0);
  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
  };
}

export interface UpcomingVaccine {
  cattleId: string;
  detail: string;
  dueDate: string;
  daysLeft: number;
}

export function getUpcomingVaccines(withinDays = 14): UpcomingVaccine[] {
  const cattle = getCattle().filter((c) => c.status !== 'ขายแล้ว');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: UpcomingVaccine[] = [];

  for (const cow of cattle) {
    for (const hr of cow.healthRecords) {
      if (!hr.nextDueDate) continue;
      const due = new Date(hr.nextDueDate);
      const diffMs = due.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysLeft <= withinDays) {
        results.push({
          cattleId: cow.id,
          detail: hr.detail,
          dueDate: hr.nextDueDate,
          daysLeft,
        });
      }
    }
  }

  return results.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
