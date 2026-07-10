import axios from "axios";
import "dotenv/config";

// Shopee's internal API — same endpoints shopee.ph calls in the browser.
//
// IMPORTANT NOTES FROM SNIFFED HEADERS (July 2026):
//   - shop/get_items is now a POST endpoint with a JSON body (not GET + params)
//   - x-sap-ri and x-sap-sec are dynamic anti-bot signatures generated client-side.
//     We omit them here — requests still work without them when a valid session
//     cookie is present, but if Shopee tightens checks, you may need OpenClaw
//     (browser automation) to generate these per-request.
//   - A logged-in cookie (SPC_U present) is fine and lasts longer than guest cookies.
//
// REFRESHING THE COOKIE:
//   1. Open shopee.ph (logged in or out) in your browser.
//   2. DevTools → Network → filter "api/v4" → trigger any page action.
//   3. Copy the full "cookie:" request header value.
//   4. Paste into scraper/.env as SHOPEE_COOKIE=...

const BASE_URL = "https://shopee.ph/api/v4";

const cookie = process.env.SHOPEE_COOKIE || "";
if (!cookie) {
  console.warn(
    "[shopee] WARNING: SHOPEE_COOKIE is empty — requests will likely 403.\n" +
    "         Paste your browser cookie into scraper/.env"
  );
}

// Matched to the sniffed Firefox/macOS session headers
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:152.0) Gecko/20100101 Firefox/152.0",
  "Accept": "*/*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "keep-alive",
  "Origin": "https://shopee.ph",
  "Referer": "https://shopee.ph/",
  "DNT": "1",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Sec-GPC": "1",
  "Cookie": cookie,
};

const client = axios.create({
  baseURL: BASE_URL,
  headers: DEFAULT_HEADERS,
  timeout: 15000,
  maxRedirects: 5,
});

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWithRetry(path, params, { maxRetries = 3, delayMs = 2000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data } = await client.get(path, { params });
      return data;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      console.warn(`[shopee] GET ${path} attempt ${attempt} failed (status ${status ?? "?"})`);
      if (status === 403) console.warn("[shopee] 403 — refresh SHOPEE_COOKIE in scraper/.env");
      if (status === 404) { console.warn("[shopee] 404 — endpoint path changed, re-sniff from DevTools"); break; }
      await sleep(status === 429 ? delayMs * attempt * 3 : delayMs * attempt);
    }
  }
  throw lastError;
}

async function postWithRetry(path, body, { maxRetries = 3, delayMs = 2000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data } = await client.post(path, body, {
        headers: { "Content-Type": "application/json" },
      });
      return data;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      console.warn(`[shopee] POST ${path} attempt ${attempt} failed (status ${status ?? "?"})`);
      if (status === 403) console.warn("[shopee] 403 — refresh SHOPEE_COOKIE in scraper/.env");
      if (status === 404) { console.warn("[shopee] 404 — endpoint path changed, re-sniff from DevTools"); break; }
      await sleep(status === 429 ? delayMs * attempt * 3 : delayMs * attempt);
    }
  }
  throw lastError;
}

// ── Endpoints ────────────────────────────────────────────────────────────────

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
  return getWithRetry("/search/search_items", params, opts);
}

// shop/get_items is now a POST with a JSON body (confirmed from sniffed headers)
export async function getShopItems(shopId, { limit = 30, offset = 0 } = {}, opts) {
  // If this still 404s, open DevTools while browsing a shop page on shopee.ph,
  // find the shop product listing POST request, and update the path + body shape here.
  const body = {
    shopid: shopId,
    limit,
    offset,
    tab_type: 0,
    sort_type: 1,
    need_filter: 1,
  };
  return postWithRetry("/shop/get_items", body, opts);
}

export async function getItemDetail(shopId, itemId, opts) {
  const params = { shopid: shopId, itemid: itemId };
  return getWithRetry("/item/get", params, opts);
}

const cookie = process.env.SHOPEE_COOKIE || "";
if (!cookie) {
  console.warn(
    "[shopee] WARNING: SHOPEE_COOKIE is empty — requests will likely 403.\n" +
    "         Grab a cookie from DevTools (see README) and set it in scraper/.env"
  );
}

// Keep this header set close to what a real Chrome browser sends.
// If 403s persist even with a valid cookie, re-sniff all headers from DevTools
// and replace the block below wholesale.
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://shopee.ph/",
  Origin: "https://shopee.ph",
  "X-API-SOURCE": "pc",
  "X-Requested-With": "XMLHttpRequest",
  "sec-ch-ua": '"Chromium";v="125", "Not.A/Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  Cookie: cookie,
};

const client = axios.create({
  baseURL: BASE_URL,
  headers: DEFAULT_HEADERS,
  timeout: 15000,
  // Follow redirects — Shopee occasionally 302s on edge nodes
  maxRedirects: 5,
});

export function sleep(ms) {
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

      if (status === 403) {
        console.warn(
          "[shopee] 403 = anti-bot rejection. Most likely cause: stale/missing cookie.\n" +
          "         Refresh SHOPEE_COOKIE in scraper/.env and retry."
        );
      }
      if (status === 404) {
        console.warn(
          "[shopee] 404 = endpoint path or params have changed on Shopee's side.\n" +
          "         Re-sniff the correct path from DevTools (see client.js header comment)."
        );
        // No point retrying a 404 — endpoint itself is wrong
        break;
      }

      const backoff = (status === 429) ? delayMs * attempt * 3 : delayMs * attempt;
      await sleep(backoff);
    }
  }
  throw lastError;
}

// ── Endpoints ────────────────────────────────────────────────────────────────
// If any of these return 404, open DevTools on shopee.ph, reproduce the action
// (search / browse shop), and find the updated path in the Network tab.

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
    // Required as of mid-2024 — Shopee checks this matches the cookie session
    // If still 403, try removing this param (it varies by session type)
    SPC_CDS_VER: 2,
  };
  if (matchId) params.match_id = matchId;
  return requestWithRetry("/search/search_items", params, opts);
}

export async function getShopItems(shopId, { limit = 30, offset = 0 } = {}, opts) {
  // NOTE: Shopee moved shop product listing to a different path — update here
  // if 404 persists after checking DevTools. Common alternates seen in the wild:
  //   /shop/get_items          (older)
  //   /pdp/get_pc_promotions   (promo-scoped)
  //   /recommend/recommend_by_shop (recommendation-based listing)
  const params = {
    shopid: shopId,
    limit,
    offset,
    tab_type: 0,    // 0 = all items (some versions use "tab" key instead)
    sort_type: 1,
  };
  return requestWithRetry("/shop/get_items", params, opts);
}

export async function getItemDetail(shopId, itemId, opts) {
  const params = { shopid: shopId, itemid: itemId };
  return requestWithRetry("/item/get", params, opts);
}
