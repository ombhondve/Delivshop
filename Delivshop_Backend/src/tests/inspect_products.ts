import { query } from '../config/database.js';

async function main() {
  const res = await query('SELECT id, name, sku, shop_id FROM products LIMIT 10');
  console.log(res.rows);
  process.exit(0);
}

main().catch(console.error);
