import "dotenv/config";
import express from "express";
import cors from "cors";
import itemsRouter from "./routes/items.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/items", itemsRouter);

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
