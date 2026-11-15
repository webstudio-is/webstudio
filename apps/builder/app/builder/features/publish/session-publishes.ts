import type { DiagnosticFinding } from "./diagnostics";

export type SessionPublish = {
  buildId: string;
  domains: string[];
  target: "site" | "static";
  staticName?: string;
  findings: DiagnosticFinding[];
  logHandle?: string;
  status: "pending" | "success" | "failed";
  code?: string;
  startedAt?: string;
  completedAt?: string;
  failedStage?: string;
  issues?: { severity: "error" | "warning"; message: string }[];
  issuesOmitted?: number;
  logState?: "loading" | "available" | "unavailable";
  logText?: string;
};

const decodeChunk = (chunk: string) => {
  const binary = atob(chunk.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export const decodePublishLog = (chunks: string[]) => {
  const decoder = new TextDecoder();
  return chunks
    .map((chunk, index) =>
      decoder.decode(decodeChunk(chunk), { stream: index < chunks.length - 1 })
    )
    .join("");
};

export const getPublishDuration = (item: SessionPublish) => {
  if (item.startedAt === undefined || item.completedAt === undefined) {
    return;
  }
  const duration = Date.parse(item.completedAt) - Date.parse(item.startedAt);
  if (Number.isFinite(duration) && duration >= 0) {
    return Math.round(duration / 1000);
  }
};

export const selectSessionPublishes = (
  items: SessionPublish[],
  target: "site" | "static",
  domain?: string
) =>
  items.filter(
    (item) =>
      item.target === target &&
      (domain === undefined || item.domains.includes(domain))
  );
