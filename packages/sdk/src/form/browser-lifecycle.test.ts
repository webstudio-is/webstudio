import { expect, test, vi } from "vitest";
import {
  FormSubmissionController,
  type FormSubmissionCallbacks,
} from "./browser-lifecycle";
import type { ManagedFormResponse } from "./shared";

const success: ManagedFormResponse = {
  success: true,
  status: 200,
  results: [],
  errors: [],
};

const createCallbacks = (): FormSubmissionCallbacks => ({
  onPending: vi.fn(),
  onResult: vi.fn(),
  onState: vi.fn(),
  onFeedback: vi.fn(),
  getRedirectBaseUrl: () => "https://example.com/form",
  getLocation: () => "https://example.com/form",
  getNavigationToken: () => undefined,
});

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const abortableSubmission = (controller: AbortController) =>
  new Promise<ManagedFormResponse>((_resolve, reject) => {
    controller.signal.addEventListener("abort", () =>
      reject(new Error("aborted"))
    );
  });

test("an unhandled redirect still refreshes and reveals success", async () => {
  const callbacks = createCallbacks();
  callbacks.successRedirect = "/thank-you";
  callbacks.onRefresh = vi.fn();
  const controller = new FormSubmissionController(() => callbacks);
  expect(
    controller.submit(
      Promise.resolve(success),
      new AbortController(),
      undefined,
      "https://example.com/form"
    )
  ).toBe(true);
  await settle();
  expect(callbacks.onRefresh).toHaveBeenCalledOnce();
  expect(callbacks.onFeedback).toHaveBeenCalledOnce();
  expect(callbacks.onState).toHaveBeenCalledWith("success");
  expect(callbacks.onResult).toHaveBeenCalledExactlyOnceWith(success);
});

test("refresh failure cannot replace a successful POST result", async () => {
  const callbacks = createCallbacks();
  callbacks.onRefresh = vi.fn().mockRejectedValue(new Error("GET failed"));
  callbacks.onError = vi.fn();
  const controller = new FormSubmissionController(() => callbacks);
  controller.submit(
    Promise.resolve(success),
    new AbortController(),
    undefined,
    "https://example.com/form"
  );
  await settle();
  expect(callbacks.onError).toHaveBeenCalledOnce();
  expect(callbacks.onResult).toHaveBeenCalledExactlyOnceWith(success);
  expect(callbacks.onState).toHaveBeenCalledExactlyOnceWith("success");
  expect(callbacks.onFeedback).toHaveBeenCalledOnce();
});

test("duplicate submission aborts and observes the rejected promise", async () => {
  const callbacks = createCallbacks();
  const controller = new FormSubmissionController(() => callbacks);
  let resolveFirst!: (response: ManagedFormResponse) => void;
  const first = new Promise<ManagedFormResponse>((resolve) => {
    resolveFirst = resolve;
  });
  const firstAbort = new AbortController();
  expect(
    controller.submit(first, firstAbort, undefined, "https://example.com/form")
  ).toBe(true);

  const duplicateAbort = new AbortController();
  expect(
    controller.submit(
      abortableSubmission(duplicateAbort),
      duplicateAbort,
      undefined,
      "https://example.com/form"
    )
  ).toBe(false);
  expect(duplicateAbort.signal.aborted).toBe(true);
  expect(firstAbort.signal.aborted).toBe(false);
  expect(controller.pending).toBe(true);

  resolveFirst(success);
  await settle();
  expect(callbacks.onResult).toHaveBeenCalledExactlyOnceWith(success);
  expect(callbacks.onState).toHaveBeenCalledExactlyOnceWith("success");
  expect(controller.pending).toBe(false);
});

test("disposed controller aborts and observes the rejected promise", async () => {
  const callbacks = createCallbacks();
  const controller = new FormSubmissionController(() => callbacks);
  controller.dispose();

  const refusedAbort = new AbortController();
  expect(
    controller.submit(
      abortableSubmission(refusedAbort),
      refusedAbort,
      undefined,
      "https://example.com/form"
    )
  ).toBe(false);
  expect(refusedAbort.signal.aborted).toBe(true);
  await settle();
  expect(controller.pending).toBe(false);
  expect(callbacks.onResult).not.toHaveBeenCalled();
  expect(callbacks.onState).not.toHaveBeenCalled();
});
