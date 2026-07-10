import "dotenv/config";
import { readFile } from "fs/promises";
import { runShopScrape, runKeywordSearch } from "./src/scraper.js";
import { close } from "./src/db.js";

const config = JSON.parse(
  await readFile(new URL("./config/targets.json", import.meta.url), "utf-8")
);

for (const shop of config.shops) {
  try {
    const n = await runShopScrape(shop, config);
    console.log(`[done] ${shop.name}: ${n} items\n`);
  } catch (err) {
    console.error(`[error] ${shop.name}:`, err.message);
  }
}

for (const search of config.keywordSearches) {
  try {
    const n = await runKeywordSearch(search.keyword, search.matchId, config);
    console.log(`[done] "${search.keyword}": ${n} items\n`);
  } catch (err) {
    console.error(`[error] "${search.keyword}":`, err.message);
  }
}

await close();
console.log("Scrape complete.");
