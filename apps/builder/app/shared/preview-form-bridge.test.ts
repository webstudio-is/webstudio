import { draftPersistence } from "./sync/draft-persistence";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { fetch as builderFetch } from "~/shared/fetch.client";
import { submitPreviewForm } from "./preview-form-bridge";
import { subscribePreviewFormRequests } from "./preview-form-parent";

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

vi.mock("~/shared/fetch.client", () => ({ fetch: vi.fn() }));

const sendToCanvas = vi.fn(
  ({ type, payload }: { type: string; payload?: unknown }) => {
    for (const listener of listeners.get(type) ?? []) {
      listener(structuredClone(payload));
    }
  }
);

beforeEach(() => {
  draftPersistence.reset(parseBuilderUrl(window.location.href).projectId);
});

afterEach(() => {
  draftPersistence.reset();
  listeners.clear();
  vi.clearAllMocks();
  vi.useRealTimers();
});

test("Preview sends the current FormData with files through the authenticated Builder fetch", async () => {
  const response = {
    success: true,
    status: 200,
    results: [{ resourceId: "email", status: 200, body: { sent: true } }],
    errors: [],
  };
  vi.mocked(builderFetch).mockResolvedValue(Response.json(response));
  const unsubscribe = subscribePreviewFormRequests(sendToCanvas);
  const file = new File(["attached"], "note.txt", { type: "text/plain" });
  const result = submitPreviewForm({
    values: { email: "visitor@example.com", attachments: [file] },
    managedFormId: "form-1",
    path: "/contact?source=preview",
    signal: new AbortController().signal,
  });

  await expect(result).resolves.toEqual(response);
  expect(builderFetch).toHaveBeenCalledOnce();
  const [url, init] = vi.mocked(builderFetch).mock.calls[0];
  expect(new URL(String(url)).pathname).toBe("/rest/preview-form");
  expect(new URL(String(url)).searchParams.get("path")).toBe(
    "/contact?source=preview"
  );
  expect(init?.credentials).toBe("same-origin");
  const formData = init?.body as FormData;
  expect(formData.get("email")).toBe("visitor@example.com");
  const attachment = formData.get("attachments") as File;
  expect(attachment.name).toBe("note.txt");
  expect(await attachment.text()).toBe("attached");
  expect(formData.get("ws--managed-form-id")).toBe("form-1");
  expect(formData.get("ws--managed-form-array-names")).toBe('["attachments"]');
  unsubscribe();
});

test("aborting a Preview submission aborts the parent request and sends no result", async () => {
  vi.mocked(builderFetch).mockImplementation((_url, init) => {
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  });
  const unsubscribe = subscribePreviewFormRequests(sendToCanvas);
  const controller = new AbortController();
  const result = submitPreviewForm({
    values: { email: "visitor@example.com" },
    managedFormId: "form-1",
    path: "/contact",
    signal: controller.signal,
  });
  await vi.waitFor(() => expect(builderFetch).toHaveBeenCalledOnce());
  const requestSignal = vi.mocked(builderFetch).mock.calls[0][1]?.signal;

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
  const unsubscribe = subscribePreviewFormRequests(sendToCanvas);
  const result = await submitPreviewForm({
    values: {},
    managedFormId: "form",
    path: "/contact",
    signal: new AbortController().signal,
  });
  expect(result).toMatchObject({
    success: false,
    errors: [{ message: expect.stringContaining("could not be saved") }],
  });
  expect(builderFetch).not.toHaveBeenCalled();
  unsubscribe();
});
