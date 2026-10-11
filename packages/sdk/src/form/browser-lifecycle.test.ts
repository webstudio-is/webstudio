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
