import axios from "axios";

// This hits Shopee's *internal* v4 API — the same endpoints shopee.ph itself
// calls when you browse the site. It is undocumented and unofficial, so:
//   - endpoints/params can change without notice
//   - aggressive polling WILL get your IP rate-limited or soft-banned
//   - this is for personal/aggregator use on public data, not resale of Shopee's data
//
// Keep requestDelayMs generous (config/targets.json) and don't run this
// from a shared IP that also needs to browse Shopee normally.

const BASE_URL = "https://shopee.ph/api/v4";

// Headers matter a lot here — Shopee's edge will 403/serve garbage without
// a browser-like fingerprint. Pull a fresh 'cookie' string from your own
// logged-out browser session (DevTools -> Network -> any shopee.ph request
// -> copy request headers) if this stops working; the anti-bot layer
// rotates what it checks periodically.
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://shopee.ph/",
  "X-API-SOURCE": "pc",
  // A real cookie string (even an anonymous/guest one) meaningfully improves
  // your success rate. Grab one manually and drop it in a .env file, e.g.
  // SHOPEE_COOKIE="SPC_F=...; SPC_SI=...; ..."
  Cookie: process.env.SHOPEE_COOKIE || "",
};

const client = axios.create({
  baseURL: BASE_URL,
  headers: DEFAULT_HEADERS,
  timeout: 15000,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry(path, params, { maxRetries = 3, delayMs = 2000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data } = await client.get(path, { params });
      return data;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      console.warn(`[shopee] ${path} attempt ${attempt} failed (status ${status ?? "?"})`);
      // Back off harder on 403/429 — that's Shopee telling you to slow down
      const backoff = status === 403 || status === 429 ? delayMs * attempt * 2 : delayMs * attempt;
      await sleep(backoff);
    }
  }
  throw lastError;
}

// Search products by keyword (optionally scoped to a category via matchId)
export async function searchItems(keyword, { matchId = null, limit = 30, page = 0 } = {}, opts) {
  const params = {
    by: "relevancy",
    keyword,
    limit,
    newest: page * limit,
    order: "desc",
    page_type: "search",
    scenario: "PAGE_GLOBAL_SEARCH",
    version: 2,
  };
  if (matchId) params.match_id = matchId;
  return requestWithRetry("/search/search_items", params, opts);
}

// Get all products currently listed by a specific shop
export async function getShopItems(shopId, { limit = 30, offset = 0 } = {}, opts) {
  const params = {
    shopid: shopId,
    limit,
    offset,
    tab: "all",
  };
  return requestWithRetry("/shop/get_items", params, opts);
}

// Get full detail (price, stock, variants) for one product
export async function getItemDetail(shopId, itemId, opts) {
  const params = { shopid: shopId, itemid: itemId };
  return requestWithRetry("/item/get", params, opts);
}

export { sleep };
