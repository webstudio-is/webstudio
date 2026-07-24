import path from "node:path";
import { fileURLToPath } from "node:url";

const migrationsCliDir = path.dirname(fileURLToPath(import.meta.url));

export const prismaDir = path.resolve(migrationsCliDir, "..", "prisma");
export const schemaFilePath = path.join(prismaDir, "schema.prisma");
export const migrationsDir = path.join(prismaDir, "migrations");
