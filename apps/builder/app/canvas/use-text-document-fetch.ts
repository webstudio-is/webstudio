import { useLayoutEffect } from "react";
import { builderApi } from "~/shared/builder-api";
import { $currentSystem } from "~/shared/system";
import { $pages, $dataSources, $resources } from "~/shared/sync/data-stores";
import { createCanvasTextDocumentFetch } from "./text-document-fetch";

export const useCanvasTextDocumentFetch = (isPreviewMode: boolean) => {
  useLayoutEffect(() => {
    if (isPreviewMode === false) {
      return;
    }
    const originalFetch = window.fetch;
    const previewFetch = createCanvasTextDocumentFetch({
      fetch: originalFetch,
      getBaseUrl: () =>
        new URL($currentSystem.get().pathname, window.location.origin).href,
      getData: () => ({
        pages: $pages.get(),
        dataSources: $dataSources.get(),
        resources: $resources.get(),
      }),
      loadResource: (request, signal) =>
        builderApi.loadResourceRequest(request, signal),
    });
    window.fetch = previewFetch;
    return () => {
      if (window.fetch === previewFetch) {
        window.fetch = originalFetch;
      }
    };
  }, [isPreviewMode]);
};
