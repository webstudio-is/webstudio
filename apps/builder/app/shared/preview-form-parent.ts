import { $livePreviewFormValues } from "./preview-form-values";
import {
  previewFormExchanges,
  recordPreviewFormExchanges,
} from "./preview-form-inspection";
import { draftPersistence } from "./sync/draft-persistence";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import type { Publish } from "~/shared/pubsub";
import { subscribe } from "~/shared/pubsub";
import { fetch as builderFetch } from "~/shared/fetch.client";
import { submitManagedForm } from "@webstudio-is/sdk-components-react";
import type { PreviewFormRequest } from "./preview-form-bridge";

/** Keep authenticated Preview requests in the Builder, outside the Canvas. */
export const subscribePreviewFormRequests = (publish: Publish) => {
  const requests = new Map<string, AbortController>();
  const unsubscribeValues = subscribe(
    "previewFormValues",
    ({ formId, values }) => {
      const next = new Map($livePreviewFormValues.get());
      if (values === null) {
        next.delete(formId);
      } else {
        next.set(formId, values);
      }
      $livePreviewFormValues.set(next);
    }
  );
  const unsubscribeSubmit = subscribe("previewFormSubmit", (payload) => {
    const request: PreviewFormRequest = payload;
    const { id, values, managedFormId, path } = request;
    if (requests.has(id)) {
      return;
    }
    const controller = new AbortController();
    requests.set(id, controller);
    void (async () => {
      try {
        const { projectId } = parseBuilderUrl(window.location.href);
        if (projectId === undefined) {
          throw new Error("Project is not available for Preview submission.");
        }
        await draftPersistence.wait(projectId, { signal: controller.signal });
        const endpoint = new URL("/rest/preview-form", window.location.href);
        endpoint.searchParams.set("path", path);
        const response = await submitManagedForm({
          values,
          managedFormId,
          location: window.location.href,
          endpoint: endpoint.href,
          fetch: builderFetch,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          const { previewExchanges, ...publicResponse } =
            response as typeof response & { previewExchanges?: unknown };
          const inspected = previewFormExchanges.safeParse(previewExchanges);
          recordPreviewFormExchanges(
            managedFormId,
            inspected.success ? inspected.data : []
          );
          publish({
            type: "previewFormResult",
            payload: { id, response: publicResponse },
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          recordPreviewFormExchanges(managedFormId, []);
          const message =
            error instanceof Error ? error.message : "Form submission failed";
          publish({
            type: "previewFormResult",
            payload: {
              id,
              response: {
                success: false,
                status: 502,
                results: [],
                errors: [{ status: 502, body: null, message }],
              },
            },
          });
        }
      } finally {
        requests.delete(id);
      }
    })();
  });
  const unsubscribeCancel = subscribe("previewFormCancel", ({ id }) => {
    requests.get(id)?.abort();
  });

  return () => {
    unsubscribeSubmit();
    unsubscribeValues();
    $livePreviewFormValues.set(new Map());
    unsubscribeCancel();
    for (const controller of requests.values()) {
      controller.abort();
    }
    requests.clear();
  };
};
