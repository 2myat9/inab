import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let db: NeonHttpDatabase<typeof schema> | null = null;

// Lazy so the module can be imported (e.g. at build time) without DATABASE_URL.
export function getDb() {
  if (!db) {
    db = drizzle(neon(process.env.DATABASE_URL!), { schema });
  }
  return db;
}
