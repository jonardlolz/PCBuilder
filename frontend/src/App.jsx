import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL ?? "";

function useItems({ category, q }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);

    fetch(`${API}/api/items?${params}`)
      .then((r) => r.json())
      .then(({ items }) => { setItems(items); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [category, q]);

  return { items, loading, error };
}

function ItemCard({ item }) {
  const price = item.price_min
    ? `₱${Number(item.price_min).toLocaleString("en-PH")}`
    : "—";
  const updatedAt = item.last_updated
    ? new Date(item.last_updated).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div style={styles.card}>
      {item.image_url && <img src={item.image_url} alt={item.name} style={styles.img} />}
      <div style={styles.cardBody}>
        <p style={styles.category}>{item.category ?? "Uncategorized"}</p>
        <p style={styles.name}>{item.name}</p>
        <p style={styles.price}>{price}</p>
        {item.stock != null && (
          <p style={{ ...styles.stock, color: item.stock > 0 ? "#16a34a" : "#dc2626" }}>
            {item.stock > 0 ? `${item.stock} in stock` : "Out of stock"}
          </p>
        )}
        {updatedAt && <p style={styles.updated}>Updated {updatedAt}</p>}
      </div>
    </div>
  );
}

export default function App() {
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState({ category: "", q: "" });
  const { items, loading, error } = useItems(search);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>PC Builder PH</h1>
        <p style={styles.subtitle}>Live Shopee prices for PC components</p>
      </header>

      <div style={styles.filters}>
        <input
          style={styles.input}
          placeholder="Search parts…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearch({ category, q })}
        />
        <select style={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {["GPU", "CPU", "RAM", "Storage", "Motherboard", "PSU", "Case", "Cooler", "Monitor", "Peripherals"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button style={styles.btn} onClick={() => setSearch({ category, q })}>
          Search
        </button>
      </div>

      {loading && <p style={styles.status}>Loading…</p>}
      {error && <p style={{ ...styles.status, color: "#dc2626" }}>Error: {error}</p>}
      {!loading && !error && items.length === 0 && (
        <p style={styles.status}>No items yet — run a scrape first.</p>
      )}

      <div style={styles.grid}>
        {items.map((item) => <ItemCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}

const styles = {
  page: { fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "24px 16px" },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, margin: 0 },
  subtitle: { color: "#6b7280", marginTop: 4 },
  filters: { display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  input: { flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 },
  select: { padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 },
  btn: { padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 },
  card: { border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "#fff" },
  img: { width: "100%", height: 140, objectFit: "contain", background: "#f9fafb" },
  cardBody: { padding: 12 },
  category: { fontSize: 11, textTransform: "uppercase", color: "#9ca3af", margin: "0 0 4px" },
  name: { fontSize: 13, fontWeight: 600, margin: "0 0 8px", lineHeight: 1.4 },
  price: { fontSize: 18, fontWeight: 700, color: "#2563eb", margin: "0 0 4px" },
  stock: { fontSize: 12, margin: "0 0 4px" },
  updated: { fontSize: 11, color: "#9ca3af", margin: 0 },
  status: { textAlign: "center", color: "#6b7280", padding: 40 },
};
