import { searchItems, getShopItems, sleep } from "./client.js";
import { recordPrice } from "./db.js";

function normalizePrice(rawPrice) {
  return rawPrice ? rawPrice / 100000 : null;
}

async function processItem(basic, config) {
  const priceMin = normalizePrice(basic.price_min ?? basic.price);
  const priceMax = normalizePrice(basic.price_max ?? basic.price);

  await recordPrice({
    shopeeItemId: basic.itemid,
    shopeeShopId: basic.shopid,
    name: basic.name,
    category: null, // TODO: map from keyword/tag in targets.json
    priceMin,
    priceMax,
    stock: basic.stock ?? null,
  });

  console.log(`  -> ${basic.name.slice(0, 60)} ₱${priceMin?.toLocaleString()}`);
  await sleep(config.requestDelayMs);
}

export async function runShopScrape(shop, config) {
  console.log(`[shop] ${shop.name} (${shop.shopId})`);
  const opts = { maxRetries: config.maxRetries, delayMs: config.requestDelayMs };
  let offset = 0;
  const limit = 30;
  let total = 0;

  while (true) {
    const data = await getShopItems(shop.shopId, { limit, offset }, opts);
    const items = (data?.item ?? []).map((e) => e.item_basic ?? e);
    if (!items.length) break;

    for (const basic of items) {
      basic.shopid = basic.shopid ?? shop.shopId;
      await processItem(basic, config);
    }
    total += items.length;
    offset += limit;
    if (items.length < limit) break;
  }
  return total;
}

export async function runKeywordSearch(keyword, matchId, config) {
  console.log(`[search] "${keyword}"`);
  const opts = { maxRetries: config.maxRetries, delayMs: config.requestDelayMs };
  const data = await searchItems(keyword, { matchId }, opts);
  const items = (data?.items ?? []).map((e) => e.item_basic).filter(Boolean);

  for (const basic of items) {
    await processItem(basic, config);
  }
  return items.length;
}
