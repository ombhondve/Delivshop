/**
 * Packaging & Volume Calculation Utilities for Delivshop
 * Converts product package sizes, crate counts, and liquid/weight units accurately.
 */

export interface PackagingInfo {
  isLiquid: boolean;
  packagingType: string;
  packageSize: string;
  litresPerPackage: number;
  weightKgPerPackage: number;
  unitsPerCrate: number | null;
  isCrateCapacityKnown: boolean;
  missingConfigReason?: string;
}

export function parseProductPackaging(product: {
  pack_size?: string | null;
  base_unit?: string | null;
  category?: string | null;
  units_per_pack?: number | string | null;
}): PackagingInfo {
  const packSize = (product.pack_size || '').trim();
  const baseUnit = (product.base_unit || '').trim();
  const category = (product.category || '').trim();
  
  const rawUnitsPerPack = product.units_per_pack != null ? Number(product.units_per_pack) : null;
  const isCrateCapacityKnown = rawUnitsPerPack !== null && !isNaN(rawUnitsPerPack) && rawUnitsPerPack > 0;
  const unitsPerCrate = isCrateCapacityKnown ? rawUnitsPerPack : null;

  // Is it a liquid product measured in litres?
  // Only Milk, Buttermilk, Chaas, etc. with Litre/ml base unit are liquid volume products.
  // Paneer, Curd/Dahi, Butter, Khoa are solid/semi-solid sold by weight (kg/g) and excluded from liquid totals.
  const isSolidCategory = ['paneer', 'curd', 'dahi', 'butter', 'khoa', 'mawa', 'cheese', 'other dairy products'].includes(category.toLowerCase());
  const isLiquidUnit = ['litre', 'liter', 'ml', 'millilitre'].includes(baseUnit.toLowerCase());
  const isLiquidCategory = ['milk', 'buttermilk', 'chaas', 'lassi'].includes(category.toLowerCase());

  const isLiquid = !isSolidCategory && (isLiquidUnit || isLiquidCategory);

  let packagingType = 'Pouch';
  const lowerPackSize = packSize.toLowerCase();
  if (lowerPackSize.includes('pouch')) packagingType = 'Pouch';
  else if (lowerPackSize.includes('bottle')) packagingType = 'Bottle';
  else if (lowerPackSize.includes('tin') || lowerPackSize.includes('can')) packagingType = 'Tin';
  else if (lowerPackSize.includes('cup') || lowerPackSize.includes('tub')) packagingType = 'Cup';
  else if (lowerPackSize.includes('block')) packagingType = 'Block';
  else if (lowerPackSize.includes('pack')) packagingType = 'Pack';

  let litresPerPackage = 0;
  let weightKgPerPackage = 0;
  let packageSize = packSize;

  const mlMatch = packSize.match(/(\d+(?:\.\d+)?)\s*ml/i);
  const lMatch = packSize.match(/(\d+(?:\.\d+)?)\s*(?:l|litre|liter)\b/i);
  const gMatch = packSize.match(/(\d+(?:\.\d+)?)\s*g(?:ram)?\b/i);
  const kgMatch = packSize.match(/(\d+(?:\.\d+)?)\s*kg\b/i);

  if (isLiquid) {
    if (mlMatch) {
      const ml = parseFloat(mlMatch[1]);
      litresPerPackage = ml / 1000;
      packageSize = `${ml} ml`;
    } else if (lMatch) {
      const l = parseFloat(lMatch[1]);
      litresPerPackage = l;
      packageSize = `${l} L`;
    } else if (baseUnit.toLowerCase() === 'litre' || baseUnit.toLowerCase() === 'liter') {
      litresPerPackage = 1.0;
      packageSize = '1 L';
    }
  } else {
    // Solid / weight product
    if (gMatch) {
      const g = parseFloat(gMatch[1]);
      weightKgPerPackage = g / 1000;
      packageSize = `${g} g`;
    } else if (kgMatch) {
      const kg = parseFloat(kgMatch[1]);
      weightKgPerPackage = kg;
      packageSize = `${kg} kg`;
    }
  }

  return {
    isLiquid,
    packagingType,
    packageSize,
    litresPerPackage,
    weightKgPerPackage,
    unitsPerCrate,
    isCrateCapacityKnown,
    missingConfigReason: isCrateCapacityKnown ? undefined : 'Crate capacity (units per crate) is not configured in the product catalogue',
  };
}

/**
 * Remove trailing zeros and format litres sensibly: e.g. 216 -> "216 L", 0.5 -> "0.5 L"
 */
export function formatVolumeLitres(volume: number | null | undefined): string {
  if (volume == null || isNaN(volume)) return '0 L';
  const rounded = Number(volume.toFixed(2));
  return `${rounded.toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
}
