import { resolveRedirectUrl } from "../link-utils";
import type { ManagedFormResponse } from "./shared";

export type FormSubmissionState = "initial" | "success" | "error";

export type FormSubmissionCallbacks = {
  onPending: (pending: boolean) => void;
  onResult: (result: ManagedFormResponse) => void;
  onState: (state: FormSubmissionState) => void;
  onFeedback: () => void;
  onRefresh?: () => void | Promise<void>;
  onRedirect?: (destination: string) => boolean | void;
  successRedirect?: string;
  getRedirectBaseUrl: () => string;
  getLocation: () => string;
  getNavigationToken: () => string | undefined;
  onError?: (error: unknown) => void;
};

/** Owns one in-flight submission and ignores results after navigation or disposal. */
export class FormSubmissionController {
  private active?: AbortController;
  private disposed = false;
  private readonly getCallbacks: () => FormSubmissionCallbacks;

  constructor(getCallbacks: () => FormSubmissionCallbacks) {
    this.getCallbacks = getCallbacks;
  }

  get pending() {
    return this.active !== undefined;
  }

  get isDisposed() {
    return this.disposed;
  }

  cancel() {
    this.active?.abort();
    this.active = undefined;
    if (!this.disposed) {
      this.getCallbacks().onPending(false);
    }
  }

  dispose() {
    this.disposed = true;
    this.cancel();
  }

  submit(
    submission: Promise<ManagedFormResponse>,
    controller: AbortController,
    navigationToken: string | undefined,
    location: string
  ) {
    if (this.disposed || this.pending) {
      void submission.catch(() => {});
      controller.abort();
      return false;
    }
    this.active = controller;
    this.getCallbacks().onPending(true);
    const isCurrent = () =>
      !this.disposed &&
      !controller.signal.aborted &&
      navigationToken === this.getCallbacks().getNavigationToken() &&
      location === this.getCallbacks().getLocation();
    void submission
      .then(async (response) => {
        if (!isCurrent()) {
          return;
        }
        let callbacks = this.getCallbacks();
        callbacks.onPending(false);
        callbacks.onResult(response);
        callbacks.onState(response.success ? "success" : "error");
        const destination = response.success
          ? resolveRedirectUrl(
              callbacks.successRedirect,
              callbacks.getRedirectBaseUrl()
            )
          : undefined;
        let redirected = false;
        if (destination && callbacks.onRedirect) {
          redirected = callbacks.onRedirect(destination) !== false;
        }
        if (!redirected) {
          if (response.success && callbacks.onRefresh) {
            try {
              await callbacks.onRefresh();
            } catch (error) {
              (callbacks.onError ?? console.error)(error);
            }
          }
          if (isCurrent()) {
            callbacks = this.getCallbacks();
            callbacks.onFeedback();
          }
        }
      })
      .catch((error: unknown) => {
        if (!isCurrent()) {
          return;
        }
        const callbacks = this.getCallbacks();
        const message =
          error instanceof Error ? error.message : "Form submission failed";
        callbacks.onResult({
          success: false,
          status: 500,
          results: [],
          errors: [{ status: 500, body: null, message }],
        });
        callbacks.onState("error");
        callbacks.onFeedback();
      })
      .finally(() => {
        if (this.active === controller) {
          this.active = undefined;
          if (!this.disposed) {
            this.getCallbacks().onPending(false);
          }
        }
      });
    return true;
  }
}
