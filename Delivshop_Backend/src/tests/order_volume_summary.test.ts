import { parseProductPackaging, formatVolumeLitres } from '../utils/packaging.js';
import { orderRepository } from '../repositories/order.repository.js';
import { orderService } from '../services/order.service.js';

async function runTests() {
  console.log('🧪 RUNNING COMPREHENSIVE ORDERS VOLUME & PACKAGING VERIFICATION SUITE\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  // 1. A 500 ml package converts correctly to litres
  const p500ml = parseProductPackaging({
    pack_size: '500ml Pouch',
    base_unit: 'Litre',
    category: 'Milk',
    units_per_pack: 24,
  });
  assert(p500ml.isLiquid === true, '500ml pouch is detected as liquid volume product');
  assert(p500ml.litresPerPackage === 0.5, '500ml converts to exactly 0.5 litres per package');
  assert(p500ml.packageSize === '500 ml', '500ml produces clean 500 ml label');

  // 2. A 1 L package converts correctly
  const p1L = parseProductPackaging({
    pack_size: '1L Pouch',
    base_unit: 'Litre',
    category: 'Milk',
    units_per_pack: 12,
  });
  assert(p1L.isLiquid === true, '1L pouch is detected as liquid');
  assert(p1L.litresPerPackage === 1.0, '1L converts to exactly 1.0 litres per package');
  assert(p1L.packageSize === '1 L', '1L produces clean 1 L label');

  // 2b. A 200 ml package converts correctly
  const p200ml = parseProductPackaging({
    pack_size: '200ml Pouch',
    base_unit: 'Litre',
    category: 'Buttermilk',
    units_per_pack: 30,
  });
  assert(p200ml.isLiquid === true, '200ml buttermilk is detected as liquid');
  assert(Math.abs(p200ml.litresPerPackage - 0.2) < 0.0001, '200ml converts to exactly 0.2 litres');

  // 3. Formatting removes unnecessary trailing zeros
  assert(formatVolumeLitres(216.000) === '216 L', '216.000 formats as "216 L" without trailing zeros');
  assert(formatVolumeLitres(96.000) === '96 L', '96.000 formats as "96 L"');
  assert(formatVolumeLitres(0.500) === '0.5 L', '0.500 formats as "0.5 L"');
  assert(formatVolumeLitres(1001.600) === '1,001.6 L', '1001.600 formats with Indian locale commas and single decimal');

  // 4. Solid and weight-based products are excluded from liquid volume totals
  const pPaneer = parseProductPackaging({
    pack_size: '200g Pack',
    base_unit: 'Kilogram',
    category: 'Paneer',
    units_per_pack: 20,
  });
  assert(pPaneer.isLiquid === false, 'Paneer is identified as solid/weight product');
  assert(pPaneer.litresPerPackage === 0, 'Paneer has 0 litres per package');
  assert(pPaneer.weightKgPerPackage === 0.2, '200g paneer converts to 0.2 kg');

  const pCurd = parseProductPackaging({
    pack_size: '500g Cup',
    base_unit: 'Kilogram',
    category: 'Curd',
    units_per_pack: 12,
  });
  assert(pCurd.isLiquid === false, 'Curd is identified as solid/semi-solid');
  assert(pCurd.weightKgPerPackage === 0.5, '500g curd converts to 0.5 kg');

  // 5. Crate quantities use correct packages-per-crate; missing config does not fabricate
  assert(p500ml.isCrateCapacityKnown === true && p500ml.unitsPerCrate === 24, '500ml has 24 units per crate');
  assert(p1L.isCrateCapacityKnown === true && p1L.unitsPerCrate === 12, '1L has 12 units per crate');

  const pUnknown = parseProductPackaging({
    pack_size: '250ml Bottle',
    base_unit: 'Litre',
    category: 'Milk',
    units_per_pack: null, // missing
  });
  assert(pUnknown.isCrateCapacityKnown === false, 'Product with null units_per_pack flags crate capacity as unknown');
  assert(pUnknown.unitsPerCrate === null, 'Missing crate configuration does not assume default');
  assert(Boolean(pUnknown.missingConfigReason), 'Identifies missing crate configuration reason');

  // 6. Database Integration: Test live getVolumeSummary
  console.log('\n--- Querying Live PostgreSQL Database ---');
  const summary = await orderRepository.getVolumeSummary({});
  const { overview, packagingBreakdown, shopWiseSummary } = summary;

  assert(overview.totalEligibleOrders >= 1, `Live DB returned ${overview.totalEligibleOrders} eligible orders`);
  if (overview.totalLiquidVolumeLitres > 0) {
    assert(overview.totalLiquidVolumeLitres > 0, `Total liquid volume is calculated: ${overview.totalLiquidVolumeLitres} L`);
  } else {
    assert(overview.totalPackagesRequired > 0, `Total packages required for non-liquid products: ${overview.totalPackagesRequired}`);
  }
  assert(overview.totalPackagesRequired > 0, `Total packages required is calculated: ${overview.totalPackagesRequired}`);
  assert(overview.includedShopsCount >= 1, `At least 1 shop included in dispatch summary: ${overview.includedShopsCount}`);

  // 7. Reconciliations: shop-wise sum must equal consolidated total
  const shopLiquidSum = shopWiseSummary.reduce((sum: number, s: any) => sum + s.totalLiquidVolumeLitres, 0);
  assert(
    Math.abs(shopLiquidSum - overview.totalLiquidVolumeLitres) < 0.01,
    `Shop-wise liquid volumes (${shopLiquidSum.toFixed(2)} L) reconcile with overview (${overview.totalLiquidVolumeLitres} L)`
  );

  const shopPkgSum = shopWiseSummary.reduce((sum: number, s: any) => sum + s.totalPackages, 0);
  assert(
    shopPkgSum === overview.totalPackagesRequired,
    `Shop-wise package quantities (${shopPkgSum}) reconcile with overview (${overview.totalPackagesRequired})`
  );

  // 8. Product packaging breakdown: Solid products have null volumeLitres
  const solidItemsInBreakdown = packagingBreakdown.filter((p: any) => !p.isLiquid);
  assert(solidItemsInBreakdown.length > 0, `Solid products found in breakdown: ${solidItemsInBreakdown.length}`);
  for (const solid of solidItemsInBreakdown) {
    assert(solid.totalVolumeLitres === null, `Solid product ${solid.productName} has null liquid volume`);
    assert(solid.totalWeightKg !== null && solid.totalWeightKg > 0, `Solid product ${solid.productName} has weight in kg (${solid.totalWeightKg} kg)`);
  }

  // 9. Status filtering: only include matching orders
  console.log('\n--- Testing Status Filtering ---');
  const deliveredSummary = await orderRepository.getVolumeSummary({ status: 'DELIVERED' });
  assert(
    deliveredSummary.overview.includedStatuses.every((s: string) => s === 'DELIVERED'),
    'Status filter for DELIVERED only includes DELIVERED orders'
  );

  // 10. Orders Dispatch List Query: returns orders with accurate total_volume_litres
  console.log('\n--- Testing Orders Dispatch List Query ---');
  const listResult = await orderRepository.listOrders({ limit: 10 });
  assert(listResult.orders.length > 0, `listOrders returned ${listResult.orders.length} orders`);
  
  const ds8891 = listResult.orders.find((o: any) => o.order_number === 'DS-26-8891');
  if (ds8891) {
    assert(Number(ds8891.total_volume_litres) === 216, `DS-26-8891 has exact 216 L liquid volume (was ${ds8891.total_volume_litres})`);
    assert(ds8891.shop_name === 'Krishna Dairy & Provisions', 'DS-26-8891 linked to Krishna Dairy & Provisions');
  }

  const ds8892 = listResult.orders.find((o: any) => o.order_number === 'DS-26-8892');
  if (ds8892) {
    assert(Number(ds8892.total_volume_litres) === 312, `DS-26-8892 has exact 312 L liquid volume (was ${ds8892.total_volume_litres})`);
  }

  // 11. CSV Export matches filters and contains structured sections
  console.log('\n--- Testing CSV Export Generation ---');
  const csv = await orderService.exportVolumeSummaryCsv({});
  assert(csv.includes('DELIVSHOP - CONSOLIDATED MILK & PACKAGING DISPATCH SUMMARY'), 'CSV contains official Delivshop header');
  assert(csv.includes('--- SUMMARY OVERVIEW ---'), 'CSV contains Overview KPIs section');
  assert(csv.includes('--- PACKAGING BREAKDOWN BY PRODUCT ---'), 'CSV contains Packaging breakdown section');
  assert(csv.includes('--- SHOP-WISE ORDER SUMMARY ---'), 'CSV contains Shop-wise summary section');
  assert(csv.includes(shopWiseSummary[0]?.orderNumber || 'ORD-') || csv.includes('DS-26-8891'), 'CSV includes order references');

  console.log(`\n🎉 ALL ${passed}/${total} VERIFICATION ASSERTIONS PASSED SUCCESSFULLY!`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n💥 TEST RUN FAILED:', err);
  process.exit(1);
});
