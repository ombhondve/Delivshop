/**
 * Packaging & Volume Calculation Utilities for Delivshop
 * Converts product package sizes, crate counts, and liquid/weight units accurately.
 */

export interface PackagingInfo {
  isLiquid: boolean;
  dimension: 'VOLUME' | 'MASS' | 'COUNT';
  packagingType: string;
  packageSize: string;
  litresPerPackage: number;
  weightKgPerPackage: number;
  unitsPerCrate: number | null;
  isCrateCapacityKnown: boolean;
  canonicalBaseUnit: string;
  canonicalSellingUnit: string;
  displayUnit: string;
  missingConfigReason?: string;
  fullFormatted: (quantity: number) => string;
}

export function parseProductPackaging(product: {
  pack_size?: string | null;
  base_unit?: string | null;
  category?: string | null;
  selling_unit?: string | null;
  units_per_pack?: number | string | null;
}): PackagingInfo {
  const packSize = (product.pack_size || '').trim();
  const baseUnit = (product.base_unit || '').trim();
  const category = (product.category || '').trim();
  const sellingUnit = (product.selling_unit || '').trim();
  
  const rawUnitsPerPack = product.units_per_pack != null ? Number(product.units_per_pack) : null;
  const isCrateCapacityKnown = rawUnitsPerPack !== null && !isNaN(rawUnitsPerPack) && rawUnitsPerPack > 0;
  const unitsPerCrate = isCrateCapacityKnown ? rawUnitsPerPack : null;

  // Solid vs Liquid Classification
  // Solid: Butter, Khoa/Mawa, Paneer, Curd/Dahi, Cheese, Other Solid Dairy
  // Liquid: Milk, Buttermilk, Chaas, Lassi, Flavoured Milk
  const isSolidCategory = ['paneer', 'curd', 'dahi', 'butter', 'khoa', 'mawa', 'cheese', 'other dairy products'].includes(category.toLowerCase());
  const isLiquidUnit = ['litre', 'liter', 'ml', 'millilitre'].includes(baseUnit.toLowerCase());
  const isLiquidCategory = ['milk', 'buttermilk', 'chaas', 'lassi', 'flavoured milk'].includes(category.toLowerCase());

  const isLiquid = !isSolidCategory && (isLiquidUnit || isLiquidCategory);
  const dimension: 'VOLUME' | 'MASS' | 'COUNT' = isLiquid ? 'VOLUME' : (isSolidCategory || ['kilogram', 'kg', 'g', 'gram'].includes(baseUnit.toLowerCase()) ? 'MASS' : 'COUNT');

  // Packaging Type Detection
  let packagingType = 'Pack';
  const lowerPackSize = packSize.toLowerCase();
  const lowerSelling = sellingUnit.toLowerCase();

  if (lowerSelling.includes('bottle') || lowerPackSize.includes('bottle') || lowerPackSize.includes('bottel')) packagingType = 'Bottle';
  else if (lowerSelling.includes('pouch') || lowerPackSize.includes('pouch')) packagingType = 'Pouch';
  else if (lowerSelling.includes('tin') || lowerSelling.includes('can') || lowerPackSize.includes('tin') || lowerPackSize.includes('can')) packagingType = 'Tin';
  else if (lowerSelling.includes('cup') || lowerSelling.includes('tub') || lowerPackSize.includes('cup') || lowerPackSize.includes('tub')) packagingType = 'Cup';
  else if (lowerSelling.includes('block') || lowerPackSize.includes('block')) packagingType = 'Block';
  else if (lowerSelling.includes('pack') || lowerPackSize.includes('pack')) packagingType = 'Pack';
  else if (sellingUnit) packagingType = sellingUnit;

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
    } else if (baseUnit.toLowerCase() === 'kilogram' || baseUnit.toLowerCase() === 'kg') {
      weightKgPerPackage = 1.0;
      packageSize = '1 kg';
    }
  }

  const canonicalBaseUnit = isLiquid ? 'Litre' : (dimension === 'MASS' ? 'Kilogram' : 'Piece');
  const canonicalSellingUnit = sellingUnit || packagingType;

  // Pluralized display unit (e.g. Bottles, Pouches, Packs, Blocks, Packets)
  let displayUnit = canonicalSellingUnit;
  if (['bottle', 'bottel'].includes(canonicalSellingUnit.toLowerCase())) displayUnit = 'Bottles';
  else if (canonicalSellingUnit.toLowerCase() === 'pouch') displayUnit = 'Pouches';
  else if (canonicalSellingUnit.toLowerCase() === 'block') displayUnit = 'Blocks';
  else if (canonicalSellingUnit.toLowerCase() === 'cup') displayUnit = 'Cups';
  else if (canonicalSellingUnit.toLowerCase() === 'tin') displayUnit = 'Tins';
  else if (canonicalSellingUnit.toLowerCase() === 'pack' || canonicalSellingUnit.toLowerCase() === 'packet') displayUnit = 'Packets';
  else if (canonicalSellingUnit.toLowerCase() === 'piece') displayUnit = 'Pieces';
  else if (canonicalSellingUnit.toLowerCase() === 'litre' || canonicalSellingUnit.toLowerCase() === 'liter') displayUnit = 'L';
  else if (canonicalSellingUnit.toLowerCase() === 'kilogram' || canonicalSellingUnit.toLowerCase() === 'kg') displayUnit = 'kg';

  const fullFormatted = (quantity: number): string => {
    if (isLiquid && litresPerPackage > 0) {
      const totalL = Number((quantity * litresPerPackage).toFixed(2));
      if (litresPerPackage === 1.0 && displayUnit === 'L') {
        return `${totalL} L`;
      }
      return `${quantity} ${displayUnit} (${totalL} L)`;
    } else if (!isLiquid && weightKgPerPackage > 0) {
      const totalKg = Number((quantity * weightKgPerPackage).toFixed(2));
      if (weightKgPerPackage === 1.0 && displayUnit === 'kg') {
        return `${totalKg} kg`;
      }
      return `${quantity} ${displayUnit} (${totalKg} kg)`;
    }
    return `${quantity} ${displayUnit}`;
  };

  return {
    isLiquid,
    dimension,
    packagingType,
    packageSize,
    litresPerPackage,
    weightKgPerPackage,
    unitsPerCrate,
    isCrateCapacityKnown,
    canonicalBaseUnit,
    canonicalSellingUnit,
    displayUnit,
    missingConfigReason: isCrateCapacityKnown ? undefined : 'Crate capacity (units per crate) is not configured in the product catalogue',
    fullFormatted,
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
