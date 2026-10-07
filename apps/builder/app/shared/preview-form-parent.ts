import type { Publish } from "~/shared/pubsub";
import { subscribe } from "~/shared/pubsub";
import { fetch as builderFetch } from "~/shared/fetch.client";
import { submitManagedForm } from "@webstudio-is/sdk-components-react";
import type { PreviewFormRequest } from "./preview-form-bridge";

/** Keep authenticated Preview requests in the Builder, outside the Canvas. */
export const subscribePreviewFormRequests = (publish: Publish) => {
  const requests = new Map<string, AbortController>();
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
          publish({ type: "previewFormResult", payload: { id, response } });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
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
    unsubscribeCancel();
    for (const controller of requests.values()) {
      controller.abort();
    }
    requests.clear();
  };
};
