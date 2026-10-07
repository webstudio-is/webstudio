import type { ManagedFormResponse } from "@webstudio-is/sdk/runtime";
import type { submitManagedForm } from "@webstudio-is/sdk-components-react";
import { publish, subscribe } from "~/shared/pubsub";

type PreviewFormValues = Parameters<typeof submitManagedForm>[0]["values"];
const previewFormTimeoutMs = 60_000;

export type PreviewFormRequest = {
  id: string;
  values: PreviewFormValues;
  managedFormId: string;
  path: string;
};

export type PreviewFormResult = {
  id: string;
  response: ManagedFormResponse;
};

declare module "~/shared/pubsub" {
  interface PubsubMap {
    previewFormSubmit: PreviewFormRequest;
    previewFormCancel: { id: string };
    previewFormResult: PreviewFormResult;
  }
}

/** The credentialless Canvas asks the authenticated Builder to submit. */
export const submitPreviewForm = ({
  values,
  managedFormId,
  path,
  signal,
}: Omit<PreviewFormRequest, "id"> & { signal: AbortSignal }) => {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise<ManagedFormResponse>((resolve, reject) => {
    const id = crypto.randomUUID();
    const cleanup = () => {
      clearTimeout(timeoutId);
      unsubscribe();
      signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      publish({ type: "previewFormCancel", payload: { id } });
      reject(signal.reason);
    };
    const unsubscribe = subscribe("previewFormResult", (result) => {
      if (result.id !== id) {
        return;
      }
      cleanup();
      resolve(result.response);
    });
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Preview Form submission timed out"));
      publish({ type: "previewFormCancel", payload: { id } });
    }, previewFormTimeoutMs);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    try {
      publish({
        type: "previewFormSubmit",
        payload: { id, values, managedFormId, path },
      });
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};
