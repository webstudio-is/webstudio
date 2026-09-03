import { PanelBanner, Text } from "@webstudio-is/design-system";
import {
  RequestDiagnosticsContent,
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

type SourceDiagnostic = {
  severity: "error" | "warning";
  scope?: "query" | "database";
  phase?: "metadata" | "reference" | "source";
  code: string;
  message: string;
  path: string;
  line?: number;
  column?: number;
};

type QueryDiagnostic = {
  severity: "error" | "warning";
  code: string;
  path: string[];
  message: string;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && Array.isArray(value) === false
    ? (value as Record<string, unknown>)
    : undefined;

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
): SourceDiagnostic[] =>
  Array.isArray(details?.diagnostics)
    ? details.diagnostics.flatMap((value) => {
        const diagnostic = asRecord(value);
        if (
          (diagnostic?.severity !== "error" &&
            diagnostic?.severity !== "warning") ||
          typeof diagnostic.code !== "string" ||
          typeof diagnostic.message !== "string" ||
          typeof diagnostic.path !== "string"
        ) {
          return [];
        }
        return [
          {
            severity: diagnostic.severity,
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
            path: diagnostic.path,
            ...(typeof diagnostic.line === "number"
              ? { line: diagnostic.line }
              : {}),
            ...(typeof diagnostic.column === "number"
              ? { column: diagnostic.column }
              : {}),
          },
        ];
      })
    : [];

export const getRequestQueryDiagnostics = (
  details: Record<string, unknown> | undefined
): QueryDiagnostic[] =>
  Array.isArray(details?.issues)
    ? details.issues.flatMap((value) => {
        const issue = asRecord(value);
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
            code: issue.code,
            path: issue.path as string[],
            message: issue.message,
          },
        ];
      })
    : [];

export const getRequestSourceDiagnosticDescription = (
  diagnostic: SourceDiagnostic
) =>
  diagnostic.scope === undefined
    ? diagnostic.code
    : `${
        diagnostic.scope === "query" ? "Current query" : "Published database"
      } · ${diagnostic.code}`;

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
          <RequestDiagnosticsRow
            key={`${diagnostic.path}:${diagnostic.code}:${index}`}
            label={`${
              diagnostic.severity === "error" ? "Error" : "Warning"
            } · ${diagnostic.path}${
              diagnostic.line === undefined
                ? ""
                : `:${diagnostic.line}${
                    diagnostic.column === undefined
                      ? ""
                      : `:${diagnostic.column}`
                  }`
            }`}
            value={diagnostic.message}
            description={getRequestSourceDiagnosticDescription(diagnostic)}
          />
        ))}
        {queryDiagnostics.map((diagnostic, index) => (
          <RequestDiagnosticsRow
            key={`${diagnostic.path.join(".")}:${diagnostic.code}:${index}`}
            label={`${diagnostic.severity === "warning" ? "Warning" : "Error"} · Query${
              diagnostic.path.length === 0
                ? ""
                : ` · ${diagnostic.path.join(".")}`
            }`}
            value={diagnostic.message}
            description={diagnostic.code}
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
