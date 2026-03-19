import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, randomBytes } from "crypto";

const store = new Map<string, { data: string; expiresAt: number }>();

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cleanup(): void {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt < now) store.delete(key);
  }
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  cleanup();

  if (req.method === "POST") {
    const body = req.body as { data?: string };
    if (!body?.data || typeof body.data !== "string") {
      res.status(400).json({ error: "Missing data field" });
      return;
    }

    if (body.data.length > 2 * 1024 * 1024) {
      res.status(413).json({ error: "Payload too large (max 2MB)" });
      return;
    }

    const id =
      randomBytes(4).toString("hex") +
      createHash("sha256").update(body.data).digest("hex").slice(0, 4);

    store.set(id, { data: body.data, expiresAt: Date.now() + TTL_MS });
    res.status(201).json({ id });
    return;
  }

  if (req.method === "GET") {
    const id = req.query["id"];
    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    const entry = store.get(id);
    if (!entry || entry.expiresAt < Date.now()) {
      store.delete(id ?? "");
      res.status(404).json({ error: "Not found or expired" });
      return;
    }

    res.status(200).json({ data: entry.data });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
