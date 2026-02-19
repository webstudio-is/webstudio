import Papa from "papaparse";

export type ParsedRedirect = {
  old: string;
  new: string;
  status: number;
};

export type SkippedLine = {
  line: number;
  content: string;
  reason: string;
};

export type ParseResult = {
  redirects: ParsedRedirect[];
  skipped: SkippedLine[];
};

// Key mappings for normalizing different column/property names
const FROM_KEYS = [
  "from",
  "source",
  "old",
  "redirect from",
  "original url",
] as const;
const TO_KEYS = [
  "to",
  "target",
  "destination",
  "new",
  "redirect to",
  "target url",
] as const;
const STATUS_KEYS = ["status", "code", "statuscode"] as const;

type RawRecord = Record<string, unknown>;

/**
 * Detect format and parse accordingly
 */
const detectFormat = (
  content: string
): "json" | "csv" | "htaccess" | "netlify" | "empty" => {
  const trimmed = content.trim();
  if (trimmed === "") {
    return "empty";
  }

  // JSON: starts with [ or {
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return "json";
  }

  // Split into lines for further detection
  const lines = trimmed.split(/\r\n|\r|\n/);
  const nonEmptyLines = lines.filter(
    (l) => l.trim() !== "" && !l.trim().startsWith("#")
  );

  if (nonEmptyLines.length === 0) {
    return "empty";
  }

  // CSV: Check first line for known column headers (must check BEFORE htaccess)
  // This is important because Shopify uses "Redirect from,Redirect to" headers
  const firstLine = nonEmptyLines[0].toLowerCase();
  const csvHeaders = [
    ...FROM_KEYS,
    ...TO_KEYS,
    ...STATUS_KEYS,
    "permanent",
  ].map((h) => h.toLowerCase());

  // Check if first line looks like CSV headers
  const possibleHeaders = firstLine.split(/[,;\t]/);
  const matchedHeaders = possibleHeaders.filter((h) =>
    csvHeaders.includes(h.trim().toLowerCase())
  );
  if (matchedHeaders.length >= 2) {
    return "csv";
  }

  // htaccess: any line starts with "Redirect" followed by space/tab (but not comma)
  // Also check for RewriteRule or RedirectMatch which are htaccess-specific
  for (const line of nonEmptyLines) {
    const lower = line.trim().toLowerCase();
    // Must be "Redirect " followed by status or path, not "Redirect from," (CSV header)
    if (
      (lower.startsWith("redirect ") || lower.startsWith("redirect\t")) &&
      !lower.includes(",") // Avoid matching CSV headers
    ) {
      return "htaccess";
    }
    if (
      lower.startsWith("rewriterule ") ||
      lower.startsWith("redirectmatch ")
    ) {
      return "htaccess";
    }
  }

  // Check if lines have CSV-like structure (comma/semicolon/tab separated, multiple columns)
  if (
    nonEmptyLines.every((line) => {
      const parts = line.split(/[,;\t]/);
      return parts.length >= 2;
    })
  ) {
    // If first column looks like a path and has delimiters, it's CSV
    const firstPart = nonEmptyLines[0].split(/[,;\t]/)[0].trim();
    if (firstPart.startsWith("/") || firstPart.startsWith("http")) {
      return "csv";
    }
  }

  // Netlify: lines match pattern "/path /path [status]"
  // Check if most non-empty/non-comment lines match this pattern
  const netlifyPattern = /^\/\S+\s+\S+/;
  const matchingLines = nonEmptyLines.filter((line) =>
    netlifyPattern.test(line.trim())
  );
  if (
    matchingLines.length > 0 &&
    matchingLines.length >= nonEmptyLines.length * 0.5
  ) {
    return "netlify";
  }

  // Default to netlify if lines start with /
  if (nonEmptyLines[0].trim().startsWith("/")) {
    return "netlify";
  }

  return "csv"; // fallback
};

/**
 * Check if a path contains unsupported patterns
 */
const hasPlaceholder = (path: string): boolean => {
  // :param placeholders like /blog/:slug
  return /:[a-zA-Z_][a-zA-Z0-9_]*\*?/.test(path);
};

const hasWildcard = (path: string): boolean => {
  // * wildcards but not in query string
  const pathPart = path.split("?")[0];
  return pathPart.includes("*");
};

const hasConditions = (record: RawRecord): boolean => {
  return "has" in record || "missing" in record;
};

/**
 * Normalize status code
 * Returns: 301, 302, or null (for invalid/unsupported codes)
 */
const normalizeStatus = (
  value: unknown
): { status: 301 | 302 } | { skip: string } => {
  if (value === undefined || value === null || value === "") {
    return { status: 301 }; // default
  }

  // Boolean (Vercel permanent flag)
  if (typeof value === "boolean") {
    return { status: value ? 301 : 302 };
  }

  // String
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();

    if (lower === "permanent" || lower === "true") {
      return { status: 301 };
    }
    if (lower === "temporary" || lower === "temp" || lower === "false") {
      return { status: 302 };
    }

    // Numeric string (possibly with ! suffix for force)
    const numMatch = lower.match(/^(\d+)!?$/);
    if (numMatch) {
      const code = parseInt(numMatch[1], 10);
      if (code === 301 || code === 308) {
        return { status: 301 };
      }
      if (code === 302 || code === 307) {
        return { status: 302 };
      }
      if (code === 200) {
        return { skip: "rewrite (status 200)" };
      }
      return { skip: `unsupported status code ${code}` };
    }
  }

  // Number
  if (typeof value === "number") {
    if (value === 301 || value === 308) {
      return { status: 301 };
    }
    if (value === 302 || value === 307) {
      return { status: 302 };
    }
    if (value === 200) {
      return { skip: "rewrite (status 200)" };
    }
    return { skip: `unsupported status code ${value}` };
  }

  return { skip: `invalid status value` };
};

/**
 * Find a value in a record using multiple possible keys
 */
const findValue = (record: RawRecord, keys: readonly string[]): unknown => {
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    for (const [k, v] of Object.entries(record)) {
      if (k.toLowerCase() === lowerKey) {
        return v;
      }
    }
  }
  return undefined;
};

/**
 * Normalize a path - strip trailing slashes from source paths
 */
const normalizePath = (path: string, isSource: boolean): string => {
  let normalized = path.trim();
  if (isSource && normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};

/**
 * Validate and normalize a single record into a redirect
 */
const normalizeRecord = (
  record: RawRecord,
  lineNumber: number,
  originalContent: string
): { redirect: ParsedRedirect } | { skipped: SkippedLine } => {
  // Check for conditions first (Vercel/Next.js has/missing)
  if (hasConditions(record)) {
    return {
      skipped: {
        line: lineNumber,
        content: originalContent,
        reason: "contains condition (has/missing) - not supported",
      },
    };
  }

  // Find source/from
  const fromValue = findValue(record, FROM_KEYS);
  if (fromValue === undefined || fromValue === null || fromValue === "") {
    return {
      skipped: {
        line: lineNumber,
        content: originalContent,
        reason: "missing source path",
      },
    };
  }
  const from = String(fromValue);

  // Find target/to
  const toValue = findValue(record, TO_KEYS);
  if (toValue === undefined || toValue === null || toValue === "") {
    return {
      skipped: {
        line: lineNumber,
        content: originalContent,
        reason: "missing target path",
      },
    };
  }
  const to = String(toValue);

  // Check for wildcards in source
  if (hasWildcard(from)) {
    return {
      skipped: {
        line: lineNumber,
        content: originalContent,
        reason: "contains wildcard (*) - not supported",
      },
    };
  }

  // Check for placeholders in source or target
  if (hasPlaceholder(from) || hasPlaceholder(to)) {
    return {
      skipped: {
        line: lineNumber,
        content: originalContent,
        reason: "contains placeholder (:param) - not supported",
      },
    };
  }

  // Validate source path
  const normalizedFrom = normalizePath(from, true);
  if (!normalizedFrom.startsWith("/")) {
    return {
      skipped: {
        line: lineNumber,
        content: originalContent,
        reason: "source path must start with /",
      },
    };
  }

  // Validate target path
  const normalizedTo = normalizePath(to, false);
  if (!normalizedTo.startsWith("/") && !normalizedTo.startsWith("http")) {
    return {
      skipped: {
        line: lineNumber,
        content: originalContent,
        reason: "target path must start with / or http",
      },
    };
  }

  // Find and normalize status
  let statusValue = findValue(record, STATUS_KEYS);
  // Check for Vercel-style permanent flag
  if (statusValue === undefined && "permanent" in record) {
    statusValue = record.permanent;
    // Handle the boolean case
    if (typeof statusValue === "boolean") {
      // normalizeStatus will handle this
    }
  }

  const statusResult = normalizeStatus(statusValue);
  if ("skip" in statusResult) {
    return {
      skipped: {
        line: lineNumber,
        content: originalContent,
        reason: statusResult.skip,
      },
    };
  }

  return {
    redirect: {
      old: normalizedFrom,
      new: normalizedTo,
      status: statusResult.status,
    },
  };
};

/**
 * Parse CSV content using papaparse
 */
const parseCSV = (content: string): ParseResult => {
  const redirects: ParsedRedirect[] = [];
  const skipped: SkippedLine[] = [];

  // Remove BOM if present
  const cleanContent = content.replace(/^\uFEFF/, "");

  // Use papaparse for robust CSV parsing
  const parseResult = Papa.parse<Record<string, string>>(cleanContent, {
    header: false, // We'll handle headers ourselves for flexibility
    skipEmptyLines: true,
    comments: "#", // Skip comment lines
    delimiter: "", // Auto-detect delimiter
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    return {
      redirects: [],
      skipped: [
        {
          line: 1,
          content: cleanContent.slice(0, 100),
          reason: `CSV parse error: ${parseResult.errors[0].message}`,
        },
      ],
    };
  }

  const rows = parseResult.data as unknown as string[][];
  if (rows.length === 0) {
    return { redirects, skipped };
  }

  // Parse header row - check if first row contains known column names
  const firstRow = rows[0].map((cell) =>
    typeof cell === "string" ? cell.trim().toLowerCase() : ""
  );
  const hasHeader = firstRow.some(
    (h) =>
      FROM_KEYS.map((k) => k.toLowerCase()).includes(h) ||
      TO_KEYS.map((k) => k.toLowerCase()).includes(h)
  );

  const headers = hasHeader
    ? firstRow
    : ["source", "target", "status"].slice(0, firstRow.length);

  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const record: RawRecord = {};

    for (let j = 0; j < headers.length && j < row.length; j++) {
      const value = typeof row[j] === "string" ? row[j].trim() : "";
      record[headers[j]] = value;
    }

    // Skip rows that are empty after trimming
    const hasContent = Object.values(record).some((v) => v !== "");
    if (!hasContent) {
      continue;
    }

    // Calculate actual line number (accounting for header and empty lines)
    // This is approximate since papaparse may skip lines
    const lineNumber = i + 1;
    const originalContent = row.join(",");
    const result = normalizeRecord(record, lineNumber, originalContent);

    if ("redirect" in result) {
      redirects.push(result.redirect);
    } else {
      skipped.push(result.skipped);
    }
  }

  return { redirects, skipped };
};

/**
 * Parse JSON content
 */
const parseJSON = (content: string): ParseResult => {
  const redirects: ParsedRedirect[] = [];
  const skipped: SkippedLine[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      redirects: [],
      skipped: [
        {
          line: 1,
          content: content.slice(0, 100) + (content.length > 100 ? "..." : ""),
          reason: "Invalid JSON",
        },
      ],
    };
  }

  // Extract redirects array
  let records: unknown[];
  if (Array.isArray(parsed)) {
    records = parsed;
  } else if (
    typeof parsed === "object" &&
    parsed !== null &&
    "redirects" in parsed
  ) {
    const redirectsField = (parsed as { redirects: unknown }).redirects;
    if (Array.isArray(redirectsField)) {
      records = redirectsField;
    } else {
      return { redirects: [], skipped: [] };
    }
  } else {
    return { redirects: [], skipped: [] };
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Skip non-objects and comment objects
    if (typeof record !== "object" || record === null) {
      continue;
    }

    // Skip objects that are just comments
    const keys = Object.keys(record);
    if (keys.length === 1 && keys[0].startsWith("$")) {
      continue;
    }

    const lineNumber = i + 1;
    const originalContent = JSON.stringify(record);
    const result = normalizeRecord(
      record as RawRecord,
      lineNumber,
      originalContent
    );

    if ("redirect" in result) {
      redirects.push(result.redirect);
    } else {
      skipped.push(result.skipped);
    }
  }

  return { redirects, skipped };
};

/**
 * Parse Netlify _redirects format
 */
const parseNetlify = (content: string): ParseResult => {
  const redirects: ParsedRedirect[] = [];
  const skipped: SkippedLine[] = [];

  // Normalize line endings
  const normalizedContent = content.replace(/\r\n|\r/g, "\n");
  const lines = normalizedContent.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const lineNumber = i + 1;

    // Skip empty lines and comments
    if (trimmedLine === "" || trimmedLine.startsWith("#")) {
      continue;
    }

    // Split by whitespace
    const parts = trimmedLine.split(/\s+/);

    if (parts.length < 2) {
      continue; // Not a valid redirect line
    }

    const from = parts[0];
    const to = parts[1];
    const statusPart = parts[2];
    const rest = parts.slice(3).join(" ");

    // Check for conditions in remaining parts
    if (rest && /[A-Za-z]+=/.test(rest)) {
      skipped.push({
        line: lineNumber,
        content: trimmedLine,
        reason: "contains condition - not supported",
      });
      continue;
    }

    // Check for query parameter matching (e.g., /store id=:id)
    if (to.includes("=") && !to.startsWith("http")) {
      // This might be query matching like "/store id=:id /products/:id"
      // Re-parse: /source query=value /target
      skipped.push({
        line: lineNumber,
        content: trimmedLine,
        reason: "contains query parameter matching - not supported",
      });
      continue;
    }

    // Create record and normalize
    const record: RawRecord = {
      from,
      to,
      status: statusPart,
    };

    const result = normalizeRecord(record, lineNumber, trimmedLine);

    if ("redirect" in result) {
      redirects.push(result.redirect);
    } else {
      skipped.push(result.skipped);
    }
  }

  return { redirects, skipped };
};

/**
 * Parse Apache htaccess format
 */
const parseHtaccess = (content: string): ParseResult => {
  const redirects: ParsedRedirect[] = [];
  const skipped: SkippedLine[] = [];

  // Normalize line endings
  const normalizedContent = content.replace(/\r\n|\r/g, "\n");
  const lines = normalizedContent.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const lineNumber = i + 1;

    // Skip empty lines and comments
    if (trimmedLine === "" || trimmedLine.startsWith("#")) {
      continue;
    }

    const lowerLine = trimmedLine.toLowerCase();

    // Handle RewriteRule - skip with warning
    if (
      lowerLine.startsWith("rewriterule ") ||
      lowerLine.startsWith("rewriterule\t")
    ) {
      skipped.push({
        line: lineNumber,
        content: trimmedLine,
        reason: "RewriteRule is not supported - use Redirect directive",
      });
      continue;
    }

    // Handle RedirectMatch - skip with warning
    if (
      lowerLine.startsWith("redirectmatch ") ||
      lowerLine.startsWith("redirectmatch\t")
    ) {
      skipped.push({
        line: lineNumber,
        content: trimmedLine,
        reason:
          "RedirectMatch is not supported - use simple Redirect directive",
      });
      continue;
    }

    // Only process Redirect directive
    if (
      !lowerLine.startsWith("redirect ") &&
      !lowerLine.startsWith("redirect\t")
    ) {
      // Ignore other directives (RewriteEngine, RewriteBase, Options, etc.)
      continue;
    }

    // Parse Redirect directive
    // Format: Redirect [status] source target
    // Status can be: 301, 302, 307, 308, permanent, temp, or omitted (defaults to 302)
    const parts = trimmedLine.split(/\s+/);

    if (parts.length < 3) {
      continue; // Invalid Redirect directive
    }

    // parts[0] is "Redirect"
    let statusPart: string | undefined;
    let from: string;
    let to: string;

    // Check if parts[1] is a status code or keyword
    const part1Lower = parts[1].toLowerCase();
    if (
      /^\d+$/.test(parts[1]) ||
      part1Lower === "permanent" ||
      part1Lower === "temp"
    ) {
      // Redirect status source target
      statusPart = parts[1];
      from = parts[2];
      to = parts.slice(3).join(" ").trim();
    } else {
      // Redirect source target (no status, defaults to 302 in Apache)
      from = parts[1];
      to = parts.slice(2).join(" ").trim();
      statusPart = "302";
    }

    if (!from || !to) {
      continue;
    }

    const record: RawRecord = {
      from,
      to,
      status: statusPart,
    };

    const result = normalizeRecord(record, lineNumber, trimmedLine);

    if ("redirect" in result) {
      redirects.push(result.redirect);
    } else {
      skipped.push(result.skipped);
    }
  }

  return { redirects, skipped };
};

/**
 * Parse redirects from various formats (CSV, JSON, Netlify _redirects, htaccess)
 * Auto-detects format and returns parsed redirects with any skipped lines.
 */
export const parseRedirects = (content: string): ParseResult => {
  const format = detectFormat(content);

  switch (format) {
    case "empty":
      return { redirects: [], skipped: [] };
    case "json":
      return parseJSON(content);
    case "csv":
      return parseCSV(content);
    case "htaccess":
      return parseHtaccess(content);
    case "netlify":
      return parseNetlify(content);
    default:
      return { redirects: [], skipped: [] };
  }
};
