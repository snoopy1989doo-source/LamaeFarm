export function calcWeightSchoorl(chestCm: number): number {
  if (chestCm <= 22) return 0;
  return Math.round(((chestCm - 22) ** 2) / 100);
}

export function calcWeightFull(chestCm: number, bodyLengthCm: number): number {
  if (chestCm <= 0 || bodyLengthCm <= 0) return 0;
  return Math.round((chestCm ** 2 * bodyLengthCm) / 10815);
}

export function estimateWeight(chestCm: number, bodyLengthCm?: number): number {
  if (bodyLengthCm && bodyLengthCm > 0) {
    return calcWeightFull(chestCm, bodyLengthCm);
  }
  return calcWeightSchoorl(chestCm);
}

export function estimateSalePrice(weightKg: number, pricePerKg: number): number {
  return Math.round(weightKg * pricePerKg);
}

export function weightCategory(weightKg: number): string {
  if (weightKg < 100) return 'ลูกวัว';
  if (weightKg < 180) return 'วัวรุ่น';
  if (weightKg < 280) return 'วัวสาว';
  if (weightKg < 380) return 'วัวโต';
  return 'วัวใหญ่';
}
