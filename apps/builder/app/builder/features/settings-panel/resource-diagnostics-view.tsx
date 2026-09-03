import type { AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import type { ResourcePerformance } from "~/shared/resource-diagnostics";
import {
  ContentDatabaseDiagnostics,
  ResourcePerformanceDiagnostics,
} from "./content-database-diagnostics";
import {
  RequestErrorDiagnostics,
  type RequestErrorDiagnosticsValue,
} from "./request-error-diagnostics";

export const ResourceDiagnosticsView = ({
  requestError,
  diagnosticsRequestError,
  diagnostics,
  performance,
}: {
  requestError?: RequestErrorDiagnosticsValue;
  diagnosticsRequestError?: RequestErrorDiagnosticsValue;
  diagnostics?: AssetQueryPreviewDiagnostics;
  performance?: ResourcePerformance;
}) => {
  if (diagnosticsRequestError !== undefined) {
    return <RequestErrorDiagnostics value={diagnosticsRequestError} />;
  }
  if (diagnostics !== undefined) {
    return (
      <ContentDatabaseDiagnostics
        value={diagnostics}
        performance={performance}
      />
    );
  }
  if (requestError !== undefined) {
    return <RequestErrorDiagnostics value={requestError} />;
  }
  if (performance !== undefined) {
    return <ResourcePerformanceDiagnostics value={performance} />;
  }
};
