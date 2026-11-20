import "server-only";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";

// Where entries are kept:
//  - on Netlify: Netlify Blobs (store "staycation", key <table>/<time>-<id>), which lasts between deploys
//  - anywhere else (local development): .data/<table>.jsonl
// Every write is a new entry; readers take the latest entry per person where that matters.

export type Table = "people" | "orders" | "votes" | "games" | "awards" | "roommates" | "declines" | "suggestions";

function blobs() {
  try {
    return getStore({ name: "staycation", consistency: "strong" });
  } catch {
    return null;
  }
}

export async function save(table: Table, row: Record<string, unknown>) {
  const record = { ...row, created_at: new Date().toISOString() };
  const store = blobs();
  if (store) {
    await store.setJSON(`${table}/${record.created_at}-${randomUUID().slice(0, 8)}`, record);
    return record;
  }
  const dir = path.join(process.cwd(), ".data");
  await mkdir(dir, { recursive: true });
  await appendFile(path.join(dir, `${table}.jsonl`), JSON.stringify(record) + "\n");
  return record;
}

/** Every entry in a table, oldest first. */
export async function rows(table: Table): Promise<Record<string, unknown>[]> {
  const store = blobs();
  if (store) {
    const { blobs: list } = await store.list({ prefix: `${table}/` });
    const keys = list.map((b) => b.key).sort();
    return (await Promise.all(keys.map((k) => store.get(k, { type: "json" })))).filter(Boolean);
  }
  try {
    const text = await readFile(path.join(process.cwd(), ".data", `${table}.jsonl`), "utf8");
    return text
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}
