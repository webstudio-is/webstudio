import { useStore } from "@nanostores/react";
import {
  $previewFormExchanges,
  getLatestPreviewExchange,
} from "~/shared/preview-form-inspection";
import {
  ResourceVariablePreview,
  type ResourcePreviewProps,
} from "./shared/resource-variable-preview";

/** Add managed Form submission history to the generic Resource preview. */
export const FormResourcePreview = (
  props: Omit<ResourcePreviewProps, "resolveInspection">
) => {
  const inspections = useStore($previewFormExchanges);
  const inspection =
    props.variable?.type === "resource"
      ? inspections.get(props.variable.resourceId)
      : undefined;
  const submissionInspection = inspection?.attempts.length
    ? {
        exchange: inspection.attempts.at(-1)!,
        revision: inspection.revision,
        responseAttempts: inspection.attempts.map(
          ({ resourceId, resourceName, response, outcome }, index) => ({
            attempt: index + 1,
            resourceId,
            resourceName,
            ...response,
            ...(outcome === undefined ? {} : { outcome }),
          })
        ),
        requestAttempts: inspection.attempts.map(
          ({ resourceId, resourceName, request, kind }, index) => ({
            attempt: index + 1,
            resourceId,
            resourceName,
            kind,
            ...request,
          })
        ),
      }
    : undefined;
  return (
    <ResourceVariablePreview
      {...props}
      resolveInspection={(resourceInspection) => {
        const exchange = getLatestPreviewExchange({
          formInspection: inspection,
          resourceInspection,
        });
        const isSubmission =
          exchange !== undefined && exchange === submissionInspection?.exchange;
        return {
          exchange,
          responseAttempts: isSubmission
            ? submissionInspection?.responseAttempts
            : undefined,
          requestAttempts: isSubmission
            ? submissionInspection?.requestAttempts
            : undefined,
        };
      }}
    />
  );
};
