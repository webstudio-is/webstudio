import { afterEach, expect, test, vi } from "vitest";
import { submitManagedForm, type UploadProgress } from "./browser-client";

class FakeRequest {
  static current?: FakeRequest;
  upload: {
    onprogress?: (event: ProgressEvent) => void;
    onload?: (event: ProgressEvent) => void;
  } = {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  status = 200;
  responseText = "";
  url = "";
  body?: FormData;
  headers = new Headers();
  aborted = false;

  constructor() {
    FakeRequest.current = this;
  }

  open(_method: string, url: string) {
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  getResponseHeader(name: string) {
    return name.toLowerCase() === "content-type" ? "application/json" : null;
  }

  send(body: FormData) {
    this.body = body;
  }

  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

const response = { success: true, status: 200, results: [], errors: [] };
const event = (loaded: number, total: number, lengthComputable = true) =>
  ({ loaded, total, lengthComputable }) as ProgressEvent;

afterEach(() => {
  FakeRequest.current = undefined;
  vi.unstubAllGlobals();
});

test("multipart upload reports measured request bytes and completes before server Actions", async () => {
  vi.stubGlobal("XMLHttpRequest", FakeRequest);
  vi.stubGlobal("window", { location: { origin: "https://example.com" } });
  const updates: UploadProgress[] = [];
  let settled = false;
  const result = submitManagedForm({
    values: { attachment: new File(["file"], "note.txt") },
    managedFormId: "form",
    location: "https://example.com/contact",
    headers: { "X-CSRF-Token": "fixture" },
    onUploadProgress: (update) => updates.push(update),
  }).then((value) => {
    settled = true;
    return value;
  });
  const request = FakeRequest.current!;
  expect(new URL(request.url).pathname).toBe("/__ws-form/contact");
  expect(request.headers.get("X-CSRF-Token")).toBe("fixture");
  expect((request.body?.get("attachment") as File).name).toBe("note.txt");

  request.upload.onprogress?.(event(4, 12));
  request.upload.onload?.(event(12, 12));
  await Promise.resolve();
  expect(updates).toEqual([
    { loaded: 4, total: 12 },
    { loaded: 12, total: 12 },
  ]);
  expect(settled).toBe(false);

  request.responseText = JSON.stringify(response);
  request.onload?.();
  await expect(result).resolves.toEqual(response);
});

test("uncomputable totals stay absent and cancellation aborts the request", async () => {
  vi.stubGlobal("XMLHttpRequest", FakeRequest);
  vi.stubGlobal("window", { location: { origin: "https://example.com" } });
  const controller = new AbortController();
  const updates: UploadProgress[] = [];
  const result = submitManagedForm({
    values: {},
    managedFormId: "form",
    location: "https://example.com/contact",
    signal: controller.signal,
    onUploadProgress: (update) => updates.push(update),
  });
  const request = FakeRequest.current!;
  request.upload.onprogress?.(event(4, 0, false));
  controller.abort("cancelled");
  await expect(result).rejects.toBe("cancelled");
  expect(request.aborted).toBe(true);
  expect(updates).toEqual([{ loaded: 4, total: undefined }]);
});
