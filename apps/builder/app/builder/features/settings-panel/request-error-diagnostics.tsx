import { PanelBanner, Text } from "@webstudio-is/design-system";
import {
  RequestDiagnosticsContent,
  RequestDiagnosticDisclosure,
  RequestDiagnosticsRow,
  RequestDiagnosticsTable,
} from "./request-inspector";

export type RequestErrorDiagnosticsValue = {
  status?: number;
  statusText?: string;
  code?: string;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
};

type SourcePoint = {
  line: number;
  column: number;
  offset?: number;
};

type SourceRange = {
  start: SourcePoint;
  end: SourcePoint;
};

type SourceDiagnostic = {
  severity: "error" | "warning";
  scope?: "query" | "database";
  phase?: "metadata" | "reference" | "source";
  code: string;
  message: string;
  assetId?: string;
  path: string;
  line?: number;
  column?: number;
  reference?: string;
  nodeType?: string;
  reason?: string;
  sourceRange?: SourceRange;
};

type QueryDiagnostic = {
  severity: "error" | "warning";
  context?: "diagnostics";
  code: string;
  path: string[];
  message: string;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && Array.isArray(value) === false
    ? (value as Record<string, unknown>)
    : undefined;

const getSourcePoint = (value: unknown): SourcePoint | undefined => {
  const point = asRecord(value);
  if (
    typeof point?.line !== "number" ||
    Number.isInteger(point.line) === false ||
    point.line < 1 ||
    typeof point.column !== "number" ||
    Number.isInteger(point.column) === false ||
    point.column < 1 ||
    (point.offset !== undefined &&
      (typeof point.offset !== "number" ||
        Number.isInteger(point.offset) === false ||
        point.offset < 0))
  ) {
    return;
  }
  return {
    line: point.line,
    column: point.column,
    ...(point.offset === undefined ? {} : { offset: point.offset }),
  };
};

const getSourceRange = (value: unknown): SourceRange | undefined => {
  const range = asRecord(value);
  const start = getSourcePoint(range?.start);
  const end = getSourcePoint(range?.end);
  if (start === undefined || end === undefined) {
    return;
  }
  return { start, end };
};

const getSourceDiagnostic = ({
  value,
  path,
  defaultSeverity,
}: {
  value: unknown;
  path: string | undefined;
  defaultSeverity?: SourceDiagnostic["severity"];
}): SourceDiagnostic | undefined => {
  const diagnostic = asRecord(value);
  const severity =
    diagnostic?.severity === "error" || diagnostic?.severity === "warning"
      ? diagnostic.severity
      : defaultSeverity;
  if (
    severity === undefined ||
    typeof diagnostic?.code !== "string" ||
    typeof diagnostic.message !== "string" ||
    path === undefined
  ) {
    return;
  }
  const sourceRange = getSourceRange(diagnostic.sourceRange);
  return {
    severity,
    ...(diagnostic.scope === "query" || diagnostic.scope === "database"
      ? { scope: diagnostic.scope }
      : {}),
    ...(diagnostic.phase === "metadata" ||
    diagnostic.phase === "reference" ||
    diagnostic.phase === "source"
      ? { phase: diagnostic.phase }
      : {}),
    code: diagnostic.code,
    message: diagnostic.message,
    ...(typeof diagnostic.assetId === "string"
      ? { assetId: diagnostic.assetId }
      : {}),
    path,
    ...(typeof diagnostic.line === "number" ? { line: diagnostic.line } : {}),
    ...(typeof diagnostic.column === "number"
      ? { column: diagnostic.column }
      : {}),
    ...(typeof diagnostic.reference === "string"
      ? { reference: diagnostic.reference }
      : {}),
    ...(typeof diagnostic.nodeType === "string"
      ? { nodeType: diagnostic.nodeType }
      : {}),
    ...(typeof diagnostic.reason === "string"
      ? { reason: diagnostic.reason }
      : {}),
    ...(sourceRange === undefined ? {} : { sourceRange }),
  };
};

const isSourceIssue = (issue: Record<string, unknown> | undefined) =>
  typeof issue?.file === "string" ||
  typeof issue?.assetId === "string" ||
  issue?.phase === "metadata" ||
  issue?.phase === "reference" ||
  issue?.phase === "source" ||
  getSourceRange(issue?.sourceRange) !== undefined;

export const getRequestErrorDiagnostics = (
  value: unknown
): RequestErrorDiagnosticsValue | undefined => {
  const response = asRecord(value);
  if (response === undefined) {
    return;
  }
  const status =
    typeof response.status === "number" ? response.status : undefined;
  const statusText =
    typeof response.statusText === "string" && response.statusText !== ""
      ? response.statusText
      : undefined;
  const payload = asRecord(response.data);
  const error = asRecord(payload?.error);
  const failed =
    response.ok === false || (status !== undefined && status >= 400);
  if (error === undefined && failed === false) {
    return;
  }
  const code = typeof error?.code === "string" ? error.code : undefined;
  const details = asRecord(error?.details);
  const errorMessage =
    typeof error?.message === "string" && error.message !== ""
      ? error.message
      : undefined;
  const message =
    errorMessage ??
    statusText ??
    (status === undefined
      ? "Request failed"
      : `Request failed with status ${status}`);
  return {
    status,
    statusText,
    code,
    message,
    ...(typeof error?.retryable === "boolean"
      ? { retryable: error.retryable }
      : {}),
    ...(details === undefined ? {} : { details }),
  };
};

const formatDetail = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value);

export const getRequestSourceDiagnostics = (
  details: Record<string, unknown> | undefined
): SourceDiagnostic[] => {
  const diagnostics = Array.isArray(details?.diagnostics)
    ? details.diagnostics.flatMap((value) => {
        const diagnostic = asRecord(value);
        const parsed = getSourceDiagnostic({
          value,
          path:
            typeof diagnostic?.path === "string" ? diagnostic.path : undefined,
        });
        return parsed === undefined ? [] : [parsed];
      })
    : [];
  const fileIssues = Array.isArray(details?.issues)
    ? details.issues.flatMap((value) => {
        const issue = asRecord(value);
        if (isSourceIssue(issue) === false) {
          return [];
        }
        const issuePath =
          Array.isArray(issue?.path) &&
          issue.path.every((part) => typeof part === "string") &&
          issue.path.length > 0
            ? issue.path.join(".")
            : undefined;
        const parsed = getSourceDiagnostic({
          value,
          path:
            typeof issue?.file === "string"
              ? issue.file
              : (issuePath ??
                (typeof issue?.assetId === "string"
                  ? issue.assetId
                  : undefined)),
          defaultSeverity: "error",
        });
        return parsed === undefined ? [] : [parsed];
      })
    : [];
  return [...diagnostics, ...fileIssues];
};

export const getRequestQueryDiagnostics = (
  details: Record<string, unknown> | undefined
): QueryDiagnostic[] =>
  Array.isArray(details?.issues)
    ? details.issues.flatMap((value) => {
        const issue = asRecord(value);
        if (isSourceIssue(issue)) {
          return [];
        }
        if (
          typeof issue?.code !== "string" ||
          typeof issue.message !== "string" ||
          (issue.severity !== undefined &&
            issue.severity !== "error" &&
            issue.severity !== "warning") ||
          Array.isArray(issue.path) === false ||
          issue.path.some((part) => typeof part !== "string")
        ) {
          return [];
        }
        return [
          {
            severity: issue.severity === "warning" ? "warning" : "error",
            ...(issue.scope === "diagnostics"
              ? { context: "diagnostics" as const }
              : {}),
            code: issue.code,
            path: issue.path as string[],
            message: issue.message,
          },
        ];
      })
    : [];

export const getRequestSourceDiagnosticDescription = (
  diagnostic: SourceDiagnostic
) => {
  const parts: string[] = [];
  if (diagnostic.scope !== undefined) {
    parts.push(
      diagnostic.scope === "query" ? "Current query" : "Published database"
    );
  }
  if (diagnostic.phase !== undefined) {
    parts.push(
      diagnostic.phase === "metadata"
        ? "Metadata"
        : diagnostic.phase === "reference"
          ? "Reference"
          : "Source"
    );
  }
  parts.push(diagnostic.code);
  if (diagnostic.assetId !== undefined) {
    parts.push(`Asset: ${diagnostic.assetId}`);
  }
  if (diagnostic.reference !== undefined) {
    parts.push(`Reference: ${diagnostic.reference}`);
  }
  if (diagnostic.nodeType !== undefined) {
    parts.push(`Node type: ${diagnostic.nodeType}`);
  }
  if (diagnostic.reason !== undefined) {
    parts.push(`Reason: ${diagnostic.reason}`);
  }
  const startOffset = diagnostic.sourceRange?.start.offset;
  const endOffset = diagnostic.sourceRange?.end.offset;
  if (startOffset !== undefined && endOffset !== undefined) {
    parts.push(`Source offsets: ${startOffset}–${endOffset}`);
  } else if (startOffset !== undefined) {
    parts.push(`Source start offset: ${startOffset}`);
  } else if (endOffset !== undefined) {
    parts.push(`Source end offset: ${endOffset}`);
  }
  return parts.join(" · ");
};

export const getRequestSourceDiagnosticLabel = (
  diagnostic: SourceDiagnostic
) => {
  const severity = diagnostic.severity === "error" ? "Error" : "Warning";
  if (diagnostic.sourceRange !== undefined) {
    const { start, end } = diagnostic.sourceRange;
    return `${severity} · ${diagnostic.path}:${start.line}:${start.column}–${end.line}:${end.column}`;
  }
  if (diagnostic.line === undefined) {
    return `${severity} · ${diagnostic.path}`;
  }
  return `${severity} · ${diagnostic.path}:${diagnostic.line}${
    diagnostic.column === undefined ? "" : `:${diagnostic.column}`
  }`;
};

export const RequestErrorDiagnostics = ({
  value,
}: {
  value: RequestErrorDiagnosticsValue;
}) => {
  const sourceDiagnostics = getRequestSourceDiagnostics(value.details);
  const queryDiagnostics = getRequestQueryDiagnostics(value.details);
  return (
    <RequestDiagnosticsContent>
      <PanelBanner variant="error">
        <Text>{value.message}</Text>
      </PanelBanner>
      <RequestDiagnosticsTable>
        {value.status !== undefined && (
          <RequestDiagnosticsRow
            label="HTTP status"
            value={`${value.status}${
              value.statusText === undefined ? "" : ` ${value.statusText}`
            }`}
          />
        )}
        {value.code !== undefined && (
          <RequestDiagnosticsRow label="Error code" value={value.code} />
        )}
        <RequestDiagnosticsRow label="Message" value={value.message} />
        {sourceDiagnostics.map((diagnostic, index) => (
          <RequestDiagnosticDisclosure
            key={`${diagnostic.path}:${diagnostic.code}:${index}`}
            severity={diagnostic.severity}
            title={diagnostic.message}
            location={getRequestSourceDiagnosticLabel(diagnostic)}
            details={getRequestSourceDiagnosticDescription(diagnostic)}
          />
        ))}
        {queryDiagnostics.map((diagnostic, index) => (
          <RequestDiagnosticDisclosure
            key={`${diagnostic.path.join(".")}:${diagnostic.code}:${index}`}
            severity={diagnostic.severity}
            title={diagnostic.message}
            location={`${
              diagnostic.context === "diagnostics"
                ? "Diagnostics response"
                : "Query"
            }${
              diagnostic.path.length === 0
                ? ""
                : ` · ${diagnostic.path.join(".")}`
            }`}
            details={diagnostic.code}
          />
        ))}
        {value.retryable !== undefined && (
          <RequestDiagnosticsRow
            label="Retryable"
            value={value.retryable ? "Yes" : "No"}
          />
        )}
        {Object.entries(value.details ?? {})
          .filter(([key]) => key !== "diagnostics" && key !== "issues")
          .map(([key, detail]) => (
            <RequestDiagnosticsRow
              key={key}
              label={`Details · ${key}`}
              value={formatDetail(detail)}
            />
          ))}
      </RequestDiagnosticsTable>
    </RequestDiagnosticsContent>
  );
};
