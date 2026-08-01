import "server-only";

export { db, isPostgres, createDb, closeDb } from "./client";
export type { Db } from "./client";
