import { draftPersistence } from "./sync/draft-persistence";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import type { submitManagedForm } from "@webstudio-is/sdk/form/browser";
import { submitPreviewForm } from "./preview-form-bridge";
import { subscribePreviewFormRequests } from "./preview-form-parent";
import { $livePreviewBrowserInfo } from "./preview-form-values";
import { updateCsrfToken } from "./csrf.client";
import { inspectBuilderResponse } from "./fetch.client";
import {
  apiClientHeader,
  apiClientVersionHeader,
} from "@webstudio-is/trpc-interface/api-compatibility";

const listeners = vi.hoisted(
  () => new Map<string, Set<(payload: unknown) => void>>()
);

vi.mock("~/shared/pubsub", () => ({
  publish: ({ type, payload }: { type: string; payload?: unknown }) => {
    for (const listener of listeners.get(type) ?? []) {
      listener(structuredClone(payload));
    }
  },
  subscribe: (type: string, listener: (payload: unknown) => void) => {
    const handlers = listeners.get(type) ?? new Set();
    handlers.add(listener);
    listeners.set(type, handlers);
    return () => handlers.delete(listener);
  },
}));

vi.mock("@webstudio-is/protocol", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@webstudio-is/protocol")>()),
  parseBuilderUrl: () => ({ projectId: "project" }),
}));

const submit = vi.fn<typeof submitManagedForm>();

const sendToCanvas = vi.fn(
  ({ type, payload }: { type: string; payload?: unknown }) => {
    for (const listener of listeners.get(type) ?? []) {
      listener(structuredClone(payload));
    }
  }
);

beforeEach(() => {
  updateCsrfToken("fixture");
  draftPersistence.reset(parseBuilderUrl(window.location.href).projectId);
});

afterEach(() => {
  draftPersistence.reset();
  $livePreviewBrowserInfo.set(new Map());
  listeners.clear();
  vi.clearAllMocks();
  submit.mockReset();
  vi.useRealTimers();
});

test("Preview passes files, request policy, and upload progress through the parent", async () => {
  const response = {
    success: true,
    status: 200,
    results: [
      {
        resourceId: "email",
        resourceName: "email",
        status: 200,
        body: { sent: true },
      },
    ],
    errors: [],
    previewBrowserInfo: {
      ip: "203.0.113.10",
      userAgent: "Preview browser",
      language: "en-GB",
      referrer: "https://builder.example/project",
    },
  };
  submit.mockImplementation(async ({ onUploadProgress }) => {
    onUploadProgress?.({ loaded: 4, total: 12 });
    onUploadProgress?.({ loaded: 12, total: 12 });
    return response;
  });
  const unsubscribe = subscribePreviewFormRequests(sendToCanvas, submit);
  const file = new File(["attached"], "note.txt", { type: "text/plain" });
  const progress: unknown[] = [];
  const result = submitPreviewForm({
    values: { email: "visitor@example.com", attachments: [file] },
    managedFormId: "form-1",
    path: "/contact?source=preview",
    signal: new AbortController().signal,
    onUploadProgress: (update) => progress.push(update),
  });

  await expect(result).resolves.toEqual({
    success: response.success,
    status: response.status,
    results: response.results,
    errors: response.errors,
  });
  expect($livePreviewBrowserInfo.get().get("form-1")).toEqual(
    response.previewBrowserInfo
  );
  const resultEvent = sendToCanvas.mock.calls
    .map(([event]) => event)
    .find((event) => event.type === "previewFormResult");
  expect(
    (resultEvent?.payload as { response?: Record<string, unknown> } | undefined)
      ?.response
  ).not.toHaveProperty("previewBrowserInfo");
  expect(progress).toEqual([
    { loaded: 4, total: 12 },
    { loaded: 12, total: 12 },
  ]);
  expect(submit).toHaveBeenCalledOnce();
  const [input] = submit.mock.calls[0];
  expect(new URL(String(input.endpoint)).pathname).toBe("/rest/preview-form");
  expect(new URL(String(input.endpoint)).searchParams.get("path")).toBe(
    "/contact?source=preview"
  );
  expect(new Headers(input.headers).get("X-CSRF-Token")).toBe("fixture");
  expect(new Headers(input.headers).get(apiClientHeader)).toBe("browser");
  expect(new Headers(input.headers).get(apiClientVersionHeader)).toBeTruthy();
  expect(input.onResponse).toBe(inspectBuilderResponse);
  expect(input.values.email).toBe("visitor@example.com");
  const attachment = (input.values.attachments as File[])[0];
  expect(attachment.name).toBe("note.txt");
  expect(await attachment.text()).toBe("attached");
  expect(input.managedFormId).toBe("form-1");
  unsubscribe();
  expect($livePreviewBrowserInfo.get()).toEqual(new Map());
});

test("aborting a Preview submission aborts the parent request and sends no result", async () => {
  submit.mockImplementation(({ signal }) => {
    return new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  });
  const unsubscribe = subscribePreviewFormRequests(sendToCanvas, submit);
  const controller = new AbortController();
  const result = submitPreviewForm({
    values: { email: "visitor@example.com" },
    managedFormId: "form-1",
    path: "/contact",
    signal: controller.signal,
  });
  await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce());
  const requestSignal = submit.mock.calls[0][0].signal;

  controller.abort("cancelled");
  await expect(result).rejects.toBe("cancelled");
  expect(requestSignal?.aborted).toBe(true);
  await Promise.resolve();
  expect(sendToCanvas).not.toHaveBeenCalled();
  unsubscribe();
});

test("times out and cleans up when the Builder does not answer", async () => {
  vi.useFakeTimers();
  const canceled: unknown[] = [];
  listeners.set(
    "previewFormCancel",
    new Set([(payload) => canceled.push(payload)])
  );
  const result = submitPreviewForm({
    values: { email: "visitor@example.com" },
    managedFormId: "form-1",
    path: "/contact",
    signal: new AbortController().signal,
  });
  const rejected = expect(result).rejects.toThrow(
    "Preview Form submission timed out"
  );

  await vi.advanceTimersByTimeAsync(60_000);
  await rejected;
  expect(canceled).toEqual([{ id: expect.any(String) }]);
  expect(listeners.get("previewFormResult")?.size).toBe(0);
});

test("failed persistence returns an error without reaching the Preview endpoint", async () => {
  draftPersistence.begin("project", "failed-edit");
  draftPersistence.complete("project", "failed-edit", false);
  const unsubscribe = subscribePreviewFormRequests(sendToCanvas, submit);
  const result = await submitPreviewForm({
    values: {},
    managedFormId: "form",
    path: "/contact",
    signal: new AbortController().signal,
  });
  expect(result).toMatchObject({
    success: false,
    errors: [
      {
        message:
          "Draft changes could not be saved. Reload before testing the Form.",
      },
    ],
  });
  expect(submit).not.toHaveBeenCalled();
  unsubscribe();
});

test("live Preview values update Builder memory without submitting or saving", async () => {
  const { publish } = await import("./pubsub");
  const { $livePreviewFormValues } = await import("./preview-form-values");
  const cleanup = subscribePreviewFormRequests(publish, submit);
  try {
    publish({
      type: "previewFormValues",
      payload: {
        selector: "form,collection[one],root",
        values: { text: "", choice: "first", flag: [] },
      },
    });
    expect(
      $livePreviewFormValues.get().get("form,collection[one],root")
    ).toEqual({
      text: "",
      choice: "first",
      flag: [],
    });
    publish({
      type: "previewFormValues",
      payload: {
        selector: "form,collection[one],root",
        values: { text: "typed", choice: "second", flag: ["yes"] },
      },
    });
    expect(
      $livePreviewFormValues.get().get("form,collection[one],root")
    ).toEqual({
      text: "typed",
      choice: "second",
      flag: ["yes"],
    });
    publish({
      type: "previewFormValues",
      payload: {
        selector: "form,collection[two],root",
        values: { text: "another occurrence" },
      },
    });
    expect(
      $livePreviewFormValues.get().get("form,collection[one],root")
    ).toEqual({
      text: "typed",
      choice: "second",
      flag: ["yes"],
    });
    expect(
      $livePreviewFormValues.get().get("form,collection[two],root")
    ).toEqual({ text: "another occurrence" });
    expect(submit).not.toHaveBeenCalled();
    publish({
      type: "previewFormValues",
      payload: {
        selector: "form,collection[one],root",
        values: null,
      },
    });
    expect($livePreviewFormValues.get().has("form,collection[one],root")).toBe(
      false
    );
    expect(
      $livePreviewFormValues.get().get("form,collection[two],root")
    ).toEqual({ text: "another occurrence" });
  } finally {
    cleanup();
  }
});

test.each(["network", "draft"])(
  "a caught %s failure clears that Form's previous inspected exchange",
  async (failure) => {
    const { $previewFormExchanges, recordPreviewFormExchanges } =
      await import("./preview-form-inspection");
    const exchange = {
      resourceId: "previous",
      resourceName: "Previous resource",
      kind: "http" as const,
      request: {
        method: "POST",
        url: "https://example.com",
        headers: [],
        body: { old: true },
        truncated: false,
      },
      response: {
        status: 200,
        statusText: "OK",
        headers: [],
        body: { old: true },
        truncated: false,
      },
    };
    recordPreviewFormExchanges("form", [exchange]);
    recordPreviewFormExchanges("other-form", [
      { ...exchange, resourceId: "other" },
    ]);
    if (failure === "draft") {
      draftPersistence.begin("project", "failed-edit");
      draftPersistence.complete("project", "failed-edit", false);
    } else {
      submit.mockRejectedValueOnce(new Error("Fixture network failure"));
    }
    const unsubscribe = subscribePreviewFormRequests(sendToCanvas, submit);
    try {
      const result = await submitPreviewForm({
        values: {},
        managedFormId: "form",
        path: "/contact",
        signal: new AbortController().signal,
      });
      expect(result.success).toBe(false);
      expect($previewFormExchanges.get().has("previous")).toBe(false);
      expect($previewFormExchanges.get().has("other")).toBe(true);
    } finally {
      unsubscribe();
      $previewFormExchanges.set(new Map());
    }
  }
);
