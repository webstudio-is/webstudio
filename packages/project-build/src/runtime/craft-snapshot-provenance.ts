import { z } from "zod";

const jsonPrimitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export type CraftSnapshotValue =
  | z.infer<typeof jsonPrimitive>
  | CraftSnapshotValue[]
  | { [key: string]: CraftSnapshotValue };

export const craftSnapshotHash = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const craftReviewedDifference = z.object({
  path: z.string().min(1),
  kind: z.enum(["missing", "added", "changed"]),
  officialValue: z.string().nullable(),
  profileValue: z.string().nullable(),
  review: z.string().min(1),
});

export type CraftReviewedDifference = z.infer<typeof craftReviewedDifference>;

export const craftReviewedDifferenceTable = z
  .object({
    tableHash: craftSnapshotHash,
    rows: z.array(craftReviewedDifference),
  })
  .superRefine(({ rows }, context) => {
    const paths = new Set<string>();
    for (const [index, row] of rows.entries()) {
      if (paths.has(row.path)) {
        context.addIssue({
          code: "custom",
          path: ["rows", index, "path"],
          message: "Reviewed Craft difference paths must be unique",
        });
      }
      paths.add(row.path);
    }
  });

export const craftSnapshotProvenance = z.object({
  schemaVersion: z.literal(1),
  authentication: z.enum(["unverified", "authenticated"]),
  official: z.object({
    projectId: z.string().min(1).nullable(),
    buildId: z.string().min(1).nullable(),
    version: z.number().int().nonnegative().nullable(),
  }),
  capture: z.object({
    capturedAt: z.string().datetime().nullable(),
    snapshotHash: craftSnapshotHash.nullable(),
  }),
  docs: z.object({
    url: z.string().url(),
    capturedAt: z.string().datetime().nullable(),
    contentHash: craftSnapshotHash.nullable(),
  }),
  reviewedDifferences: craftReviewedDifferenceTable.extend({
    reviewedAt: z.string().datetime().nullable(),
  }),
});

export type CraftSnapshotProvenance = z.infer<typeof craftSnapshotProvenance>;

const sensitiveKeys = new Set([
  "accesstoken",
  "apikey",
  "authtoken",
  "authorization",
  "clientsecret",
  "cookie",
  "password",
  "privatekey",
  "refreshtoken",
  "secret",
  "sessiontoken",
]);

export const compareCraftSnapshotText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

export const normalizeCraftSnapshotText = (value: string) =>
  value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .normalize("NFC")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/g, ""))
    .join("\n");

const sanitizeCraftSnapshotText = (value: string) =>
  normalizeCraftSnapshotText(value)
    .replace(
      /([?&](?:authToken|access_token|api_key|refresh_token|session_token)=)[^&#\s]*/gi,
      "$1[REDACTED]"
    )
    .replace(/\bBearer\s+[^\s"']+/gi, "Bearer [REDACTED]");

const normalizeSnapshotValue = (
  value: unknown,
  ancestors: Set<object>
): CraftSnapshotValue | undefined => {
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return sanitizeCraftSnapshotText(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? (Object.is(value, -0) ? 0 : value) : null;
  }
  if (typeof value !== "object") {
    return undefined;
  }
  if (ancestors.has(value)) {
    throw new TypeError("Craft snapshots must not contain circular values");
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    const normalized = value.map(
      (item) => normalizeSnapshotValue(item, ancestors) ?? null
    );
    ancestors.delete(value);
    return normalized;
  }
  const normalized: Record<string, CraftSnapshotValue> = {};
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record).sort(compareCraftSnapshotText)) {
    const normalizedKey = normalizeCraftSnapshotText(key);
    const normalizedValue = sensitiveKeys.has(
      normalizedKey.replace(/[-_]/g, "").toLowerCase()
    )
      ? "[REDACTED]"
      : normalizeSnapshotValue(record[key], ancestors);
    if (normalizedValue !== undefined) {
      normalized[normalizedKey] = normalizedValue;
    }
  }
  ancestors.delete(value);
  return normalized;
};

/** Produces JSON-safe, key-ordered data before any snapshot comparison or hash. */
export const normalizeCraftSnapshot = (value: unknown): CraftSnapshotValue =>
  normalizeSnapshotValue(value, new Set()) ?? null;

export const serializeCraftSnapshot = (value: unknown) =>
  JSON.stringify(normalizeCraftSnapshot(value));

export const hashCraftSnapshot = async (value: unknown) => {
  const bytes = new TextEncoder().encode(serializeCraftSnapshot(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}` as const;
};

const compareDifferences = (
  left: CraftReviewedDifference,
  right: CraftReviewedDifference
) =>
  compareCraftSnapshotText(left.path, right.path) ||
  compareCraftSnapshotText(left.kind, right.kind) ||
  compareCraftSnapshotText(
    left.officialValue ?? "",
    right.officialValue ?? ""
  ) ||
  compareCraftSnapshotText(left.profileValue ?? "", right.profileValue ?? "") ||
  compareCraftSnapshotText(left.review, right.review);

export const normalizeCraftReviewedDifferences = (
  rows: readonly CraftReviewedDifference[]
) => {
  const normalized = rows.map((row) =>
    craftReviewedDifference.parse({
      ...row,
      path: normalizeCraftSnapshotText(row.path),
      officialValue:
        row.officialValue === null
          ? null
          : normalizeCraftSnapshotText(row.officialValue),
      profileValue:
        row.profileValue === null
          ? null
          : normalizeCraftSnapshotText(row.profileValue),
      review: normalizeCraftSnapshotText(row.review),
    })
  );
  return normalized.sort(compareDifferences);
};

export const createCraftReviewedDifferenceTable = async (
  rows: readonly CraftReviewedDifference[]
) => {
  const normalizedRows = normalizeCraftReviewedDifferences(rows);
  return craftReviewedDifferenceTable.parse({
    tableHash: await hashCraftSnapshot(normalizedRows),
    rows: normalizedRows,
  });
};

export const createUnverifiedCraftProvenance = async (
  docsUrl: string
): Promise<CraftSnapshotProvenance> => {
  const reviewedDifferences = await createCraftReviewedDifferenceTable([]);
  return craftSnapshotProvenance.parse({
    schemaVersion: 1,
    authentication: "unverified",
    official: { projectId: null, buildId: null, version: null },
    capture: { capturedAt: null, snapshotHash: null },
    docs: { url: docsUrl, capturedAt: null, contentHash: null },
    reviewedDifferences: { reviewedAt: null, ...reviewedDifferences },
  });
};
