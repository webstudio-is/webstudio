import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ElementRef,
  type FormEvent,
} from "react";
import {
  isFormSubmission,
  validateFormSubmission,
} from "@webstudio-is/sdk/form-submission";
import type { ManagedFormResponse } from "@webstudio-is/sdk/runtime";
import { resolveRedirectUrl } from "@webstudio-is/sdk/link-utils";
import { getFormDataValue } from "./form-submission";
import { submitManagedForm } from "./managed-form-client";
import { useFormFeedbackScroll } from "./form-feedback-scroll";

export const defaultTag = "form";

export const NativeForm = forwardRef<
  ElementRef<typeof defaultTag>,
  Omit<ComponentProps<typeof defaultTag>, "action"> & {
    action?: unknown;
    "data-ws-managed-form-id"?: string;
    successRedirect?: string;
    state?: "initial" | "success" | "error";
    onStateChange?: (state: "initial" | "success" | "error") => void;
    onResultChange?: (result: ManagedFormResponse) => void;
    onManagedSubmit?: (
      formData: ReturnType<typeof getFormDataValue>,
      signal: AbortSignal
    ) => void | Promise<ManagedFormResponse>;
    previewSubmission?: boolean;
    getRedirectBaseUrl?: () => string;
    onSuccessRedirect?: (destination: string) => void;
    onSubmissionSuccess?: () => void | Promise<void>;
    navigationToken?: string;
    // These parameters define Resource expression scope in Builder.
    formData?: unknown;
    browserInfo?: unknown;
  }
>(
  (
    {
      id,
      action,
      "data-ws-managed-form-id": managedFormId,
      successRedirect,
      state,
      onStateChange,
      onResultChange,
      onManagedSubmit,
      previewSubmission: _previewSubmission,
      getRedirectBaseUrl,
      onSuccessRedirect,
      onSubmissionSuccess,
      navigationToken,
      onSubmit,
      formData,
      browserInfo,
      children,
      ...props
    },
    ref
  ) => {
    const [pending, setPending] = useState(false);
    const [internalState, setInternalState] = useState<
      "initial" | "success" | "error"
    >("initial");
    const activeRequest = useRef<AbortController>();
    const { setFormRef, prepareFeedback, revealFeedback } =
      useFormFeedbackScroll(ref, state ?? internalState);
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    useEffect(() => () => activeRequest.current?.abort(), []);
    const previousNavigationToken = useRef(navigationToken);
    const currentNavigationToken = useRef(navigationToken);
    currentNavigationToken.current = navigationToken;
    useEffect(() => {
      if (previousNavigationToken.current !== navigationToken) {
        activeRequest.current?.abort();
        activeRequest.current = undefined;
        setPending(false);
        previousNavigationToken.current = navigationToken;
      }
    }, [navigationToken]);
    const reportState = (nextState: "initial" | "success" | "error") => {
      setInternalState(nextState);
      onStateChange?.(nextState);
    };
    const reportFailure = (message: string, status = 400) => {
      onResultChange?.({
        success: false,
        status,
        results: [],
        errors: [{ status, body: null, message }],
      });
      reportState("error");
      revealFeedback();
    };
    const validSubmission = isFormSubmission(action);
    const configurationError = validSubmission
      ? validateFormSubmission(action)
      : action === undefined
        ? validateFormSubmission([])
        : "Invalid Form submission settings";
    const handleManagedSubmit = (event: FormEvent<HTMLFormElement>) => {
      try {
        onSubmit?.(event);
      } catch (error) {
        // A user callback must not restore the browser's native submit path.
        event.preventDefault();
        reportFailure(
          error instanceof Error ? error.message : "Form submission failed",
          500
        );
        return;
      }
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      if (activeRequest.current) {
        return;
      }
      prepareFeedback();
      if (configurationError) {
        reportFailure(configurationError);
        return;
      }
      if (onManagedSubmit === undefined && managedFormId === undefined) {
        reportFailure("Resource submission is unavailable");
        return;
      }
      reportState("initial");
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const values = getFormDataValue(
        event.currentTarget,
        submitter instanceof HTMLElement ? submitter : undefined
      );
      if (onManagedSubmit) {
        const controller = new AbortController();
        let submission: void | Promise<ManagedFormResponse>;
        try {
          submission = onManagedSubmit(values, controller.signal);
        } catch (error) {
          submission = Promise.reject(error);
        }
        if (submission === undefined) {
          return;
        }
        return handleSubmission(submission, controller);
      }
      const controller = new AbortController();
      const submittedNavigationToken = navigationToken;
      const submittedLocation = window.location.href;
      return handleSubmission(
        submitManagedForm({
          values,
          managedFormId: managedFormId!,
          location: submittedLocation,
          signal: controller.signal,
        }),
        controller,
        submittedNavigationToken,
        submittedLocation
      );
    };
    const handleSubmission = (
      submission: Promise<ManagedFormResponse>,
      controller = new AbortController(),
      submittedNavigationToken = navigationToken,
      submittedLocation = window.location.href
    ) => {
      activeRequest.current = controller;
      setPending(true);
      void submission
        .then((response) => {
          if (
            controller.signal.aborted ||
            submittedNavigationToken !== currentNavigationToken.current ||
            submittedLocation !== window.location.href
          ) {
            return;
          }
          setPending(false);
          onResultChange?.(response);
          reportState(response.success ? "success" : "error");
          const destination = response.success
            ? resolveRedirectUrl(
                successRedirect,
                getRedirectBaseUrl?.() ?? window.location.href
              )
            : undefined;
          if (destination) {
            if (onSuccessRedirect) {
              onSuccessRedirect(destination);
            } else {
              window.location.assign(destination);
            }
          } else {
            revealFeedback();
            if (response.success) {
              // Refresh is a separate GET. Its failure must not change the
              // completed submission result or repeat the POST.
              try {
                void Promise.resolve(onSubmissionSuccess?.()).catch(
                  console.error
                );
              } catch (error) {
                console.error(error);
              }
            }
          }
        })
        .catch((error: unknown) => {
          if (
            controller.signal.aborted ||
            submittedNavigationToken !== currentNavigationToken.current ||
            submittedLocation !== window.location.href
          ) {
            return;
          }
          const message =
            error instanceof Error ? error.message : "Form submission failed";
          reportFailure(message, 500);
        })
        .finally(() => {
          if (activeRequest.current === controller) {
            activeRequest.current = undefined;
            setPending(false);
          }
        });
    };
    return (
      <form
        {...props}
        id={hydrated ? id : undefined}
        data-ws-managed-form-id={managedFormId}
        data-state={
          state ?? (internalState === "initial" ? undefined : internalState)
        }
        aria-busy={pending || undefined}
        action={undefined}
        method="dialog"
        encType={undefined}
        ref={setFormRef}
        onSubmit={handleManagedSubmit}
      >
        <fieldset disabled={!hydrated} style={{ display: "contents" }}>
          <div style={{ display: "contents" }}>{children}</div>
        </fieldset>
      </form>
    );
  }
);

NativeForm.displayName = "NativeForm";
