import {
  $livePreviewBrowserInfo,
  $livePreviewFormValues,
  recordPreviewBrowserInfo,
} from "./preview-form-values";
import {
  previewFormExchanges,
  recordPreviewFormExchanges,
} from "./preview-form-inspection";
import {
  DraftPersistenceError,
  draftPersistence,
} from "./sync/draft-persistence";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import type { Publish } from "~/shared/pubsub";
import { subscribe } from "~/shared/pubsub";
import { fetch as builderFetch } from "~/shared/fetch.client";
import { submitManagedForm } from "@webstudio-is/sdk-components-react";
import type { PreviewFormRequest } from "./preview-form-bridge";

const getPreviewFormErrorMessage = (error: unknown) => {
  if (error instanceof DraftPersistenceError) {
    switch (error.reason) {
      case "changed":
        return "Draft synchronization changed. Reload before testing the Form.";
      case "changed-after-wait":
        return "Draft synchronization changed. Try again.";
      case "not-ready":
        return "Draft synchronization is not ready. Reload before testing the Form.";
      case "save-failed":
        return "Draft changes could not be saved. Reload before testing the Form.";
      case "timeout":
        return "Draft changes are still saving. Try submitting again once saved.";
      case "canceled":
        return "Form submission canceled";
    }
  }
  return error instanceof Error ? error.message : "Form submission failed";
};

/** Keep authenticated Preview requests in the Builder, outside the Canvas. */
export const subscribePreviewFormRequests = (publish: Publish) => {
  const requests = new Map<string, AbortController>();
  const unsubscribeValues = subscribe(
    "previewFormValues",
    ({ selector, values }) => {
      const next = new Map($livePreviewFormValues.get());
      if (values === null) {
        next.delete(selector);
      } else {
        next.set(selector, values);
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
          const { previewExchanges, previewBrowserInfo, ...publicResponse } =
            response as typeof response & {
              previewExchanges?: unknown;
              previewBrowserInfo?: unknown;
            };
          const inspected = previewFormExchanges.safeParse(previewExchanges);
          recordPreviewBrowserInfo(managedFormId, previewBrowserInfo);
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
          recordPreviewBrowserInfo(managedFormId, undefined);
          recordPreviewFormExchanges(managedFormId, []);
          const message = getPreviewFormErrorMessage(error);
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
    $livePreviewBrowserInfo.set(new Map());
    unsubscribeCancel();
    for (const controller of requests.values()) {
      controller.abort();
    }
    requests.clear();
  };
};
