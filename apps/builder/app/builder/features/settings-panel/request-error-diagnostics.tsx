import { PanelBanner, Text } from "@webstudio-is/design-system";
import {
  RequestDiagnosticsContent,
  RequestDiagnosticsRow,
  RequestDiagnosticsTable,
} from "./request-inspector";

type RequestErrorDiagnosticsValue = {
  status?: number;
  statusText?: string;
  code?: string;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
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

export const RequestErrorDiagnostics = ({
  value,
}: {
  value: RequestErrorDiagnosticsValue;
}) => (
  <RequestDiagnosticsContent>
    <PanelBanner variant="error">
      <Text>{value.message}</Text>
    </PanelBanner>
    <RequestDiagnosticsTable>
      {value.status !== undefined && (
        <RequestDiagnosticsRow
          label="HTTP status"
          value={`${value.status}${value.statusText === undefined ? "" : ` ${value.statusText}`}`}
        />
      )}
      {value.code !== undefined && (
        <RequestDiagnosticsRow label="Error code" value={value.code} />
      )}
      <RequestDiagnosticsRow label="Message" value={value.message} />
      {value.retryable !== undefined && (
        <RequestDiagnosticsRow
          label="Retryable"
          value={value.retryable ? "Yes" : "No"}
        />
      )}
      {Object.entries(value.details ?? {}).map(([key, detail]) => (
        <RequestDiagnosticsRow
          key={key}
          label={`Details · ${key}`}
          value={formatDetail(detail)}
        />
      ))}
    </RequestDiagnosticsTable>
  </RequestDiagnosticsContent>
);
