import type { DocumentGraphRuntimeObserver } from "@webstudio-is/content-engine";

export type AssetQueryPerformancePhase =
  | "build-plan"
  | "repository-authorization"
  | "source-snapshot"
  | "canonical-metadata"
  | "compiler-entries"
  | "document-graph"
  | "asset-references"
  | "source-validation"
  | "artifact-compilation"
  | "index-preparation"
  | "diagnostics-preparation"
  | "runtime-assets"
  | "document-resolution";

export type AssetQueryPerformanceEvent =
  | Readonly<{
      type: "phase-completed";
      phase: AssetQueryPerformancePhase;
      durationMs: number;
    }>
  | Readonly<{
      type: "compilation-cache";
      status: "hit" | "coalesced" | "miss" | "disabled";
    }>
  | Readonly<{
      type: "content-read";
      purpose: "compiler-entry" | "document-graph";
      byteLength: number;
    }>;

export type AssetQueryPerformanceObserver = (
  event: AssetQueryPerformanceEvent
) => void;

export const emitAssetQueryPerformanceEvent = (
  observer: AssetQueryPerformanceObserver | undefined,
  event: AssetQueryPerformanceEvent
) => {
  try {
    observer?.(event);
  } catch {
    // Observability must not change query behavior.
  }
};

export const measureAssetQueryPerformance = async <Value>({
  phase,
  operation,
  observer,
  now = () => performance.now(),
}: {
  phase: AssetQueryPerformancePhase;
  operation: () => Promise<Value>;
  observer?: AssetQueryPerformanceObserver;
  now?: () => number;
}) => {
  const startedAt = now();
  try {
    return await operation();
  } finally {
    emitAssetQueryPerformanceEvent(observer, {
      type: "phase-completed",
      phase,
      durationMs: Math.max(0, now() - startedAt),
    });
  }
};

export type AssetQueryDocumentGraphObserver = DocumentGraphRuntimeObserver;
