import { afterEach, expect, test } from "vitest";
import {
  $previewFormExchanges,
  $resourcePreviewExchanges,
  getLatestPreviewExchange,
  recordPreviewFormExchanges,
  recordResourcePreviewExchange,
  type PreviewFormExchange,
} from "./preview-form-inspection";

const exchange = (status: number): PreviewFormExchange => ({
  resourceId: "resource",
  resourceName: "Resource",
  kind: "http",
  request: {
    method: "POST",
    url: "https://example.com",
    headers: [],
    body: null,
    truncated: false,
  },
  response: {
    status,
    statusText: "OK",
    headers: [],
    body: null,
    truncated: false,
  },
});

afterEach(() => {
  $previewFormExchanges.set(new Map());
  $resourcePreviewExchanges.set(new Map());
});

test.each(["load-first", "submit-first"] as const)(
  "selects the latest actual exchange when %s",
  (order) => {
    const load = exchange(201);
    const submit = exchange(202);
    if (order === "load-first") {
      recordResourcePreviewExchange("request-key", load);
      recordPreviewFormExchanges("form", [submit]);
    } else {
      recordPreviewFormExchanges("form", [submit]);
      recordResourcePreviewExchange("request-key", load);
    }
    expect(
      getLatestPreviewExchange({
        formInspection: $previewFormExchanges.get().get("resource"),
        resourceInspection: $resourcePreviewExchanges.get().get("request-key"),
      })?.response.status
    ).toBe(order === "load-first" ? 202 : 201);
  }
);
