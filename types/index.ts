// ===============================
// LamaeFarm - TypeScript Types
// ===============================

export type CattleGender = 'เมีย' | 'ผู้';
export type CattleStatus = 'ในฟาร์ม' | 'ป่วย' | 'รอขาย' | 'ขายแล้ว';

export interface HealthRecord {
  id: string;
  date: string;
  type: 'วัคซีน' | 'ถ่ายพยาธิ' | 'รักษาโรค' | 'อื่นๆ';
  detail: string;
  dose?: string;
  operator?: string;
  nextDueDate?: string;
}

export interface WeightRecord {
  id: string;
  date: string;
  chestCircumference: number;
  bodyLength?: number;
  estimatedWeight: number;
  pricePerKg?: number;
  estimatedPrice?: number;
}

export interface BreedingRecord {
  id: string;
  date: string;
  method: 'ผสมเทียม' | 'ผสมธรรมชาติ';
  sireId?: string;
  expectedCalvingDate?: string;
  result?: 'ตั้งท้อง' | 'ไม่ตั้งท้อง' | 'รอผล' | 'คลอดแล้ว';
  calfId?: string;
  notes?: string;
}

export interface SaleRecord {
  date: string;
  buyerName?: string;
  saleWeight?: number;
  pricePerKg?: number;
  totalPrice: number;
  netProfit: number;
  notes?: string;
}

export interface Cattle {
  id: string;
  breed: string;
  gender: CattleGender;
  status: CattleStatus;
  dateEntry: string;
  buyPrice: number;
  source?: string;
  notes?: string;
  healthRecords: HealthRecord[];
  weightRecords: WeightRecord[];
  breedingRecords: BreedingRecord[];
  saleRecord?: SaleRecord;
}

export type FinanceCategory =
  | 'ยารักษาโรค'
  | 'วัคซีน'
  | 'หญ้า/อาหาร'
  | 'ค่าขนส่ง'
  | 'ค่าแรง'
  | 'อุปกรณ์ฟาร์ม'
  | 'รายได้จากขายวัว'
  | 'อื่นๆ';

export type FinanceType = 'รายรับ' | 'รายจ่าย';

export interface FinanceRecord {
  id: string;
  date: string;
  type: FinanceType;
  category: FinanceCategory;
  amount: number;
  cattleId?: string;
  notes?: string;
  status: 'อนุมัติแล้ว' | 'รออนุมัติ' | 'ปฏิเสธ';
  rejectReason?: string;
  createdTimestamp: string;
  image?: string; // base64 receipt photo
}

export interface AppSettings {
  ownerPin: string;
  workerPin: string;
  defaultPricePerKg: number;
  farmName: string;
  lineToken?: string;
}

export interface AppData {
  cattle: Cattle[];
  finance: FinanceRecord[];
  settings: AppSettings;
  lastUpdated: string;
}

export type UserRole = 'owner' | 'worker' | null;
