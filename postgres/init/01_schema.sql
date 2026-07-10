-- Runs automatically on first `docker compose up` (empty volume).
-- Re-running compose with an existing volume skips this entirely.

CREATE TABLE IF NOT EXISTS items (
  id                SERIAL PRIMARY KEY,
  shopee_item_id    BIGINT        NOT NULL,
  shopee_shop_id    BIGINT        NOT NULL,
  name              TEXT          NOT NULL,
  category          TEXT,           -- CPU | GPU | RAM | Storage | Motherboard | PSU | Case | Cooler | Monitor | Peripherals
  shopee_url        TEXT,
  image_url         TEXT,
  created_at        TIMESTAMPTZ   DEFAULT now(),
  UNIQUE (shopee_item_id, shopee_shop_id)
);

CREATE TABLE IF NOT EXISTS price_snapshots (
  id          SERIAL PRIMARY KEY,
  item_id     INTEGER       NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  price_min   NUMERIC(10,2),
  price_max   NUMERIC(10,2),
  stock       INTEGER,
  scraped_at  TIMESTAMPTZ   DEFAULT now()
);

-- Speeds up "latest price for item" and "price history for item" queries
CREATE INDEX IF NOT EXISTS idx_snapshots_item_time
  ON price_snapshots (item_id, scraped_at DESC);

-- Speeds up category-browse queries (e.g. "all GPUs, sorted by price")
CREATE INDEX IF NOT EXISTS idx_items_category
  ON items (category);
