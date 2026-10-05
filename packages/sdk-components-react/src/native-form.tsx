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
  emptyFormDestinationMessage,
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
  ComponentProps<typeof defaultTag> & {
    submission?: unknown;
    "data-ws-managed-form-id"?: string;
    successRedirect?: string;
    state?: "initial" | "success" | "error";
    onStateChange?: (state: "initial" | "success" | "error") => void;
    onResultChange?: (result: ManagedFormResponse) => void;
    onManagedSubmit?: (formData: ReturnType<typeof getFormDataValue>) => void;
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
      submission,
      "data-ws-managed-form-id": managedFormId,
      successRedirect,
      state,
      onStateChange,
      onResultChange,
      onManagedSubmit,
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
    const [error, setError] = useState<string>();
    const [result, setResult] = useState<ManagedFormResponse>();
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
    const reportFailure = (message: string) => {
      setError(message);
      onResultChange?.({
        success: false,
        status: 400,
        results: [],
        errors: [{ status: 400, body: null, message }],
      });
      reportState("error");
      revealFeedback();
    };
    const validSubmission = isFormSubmission(submission);
    const configurationError = validSubmission
      ? validateFormSubmission(submission)
      : submission === undefined
        ? validateFormSubmission({ destinations: [] })
        : "Invalid Form submission settings";
    const handleManagedSubmit = (event: FormEvent<HTMLFormElement>) => {
      onSubmit?.(event);
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
      setError(undefined);
      reportState("initial");
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const values = getFormDataValue(
        event.currentTarget,
        submitter instanceof HTMLElement ? submitter : undefined
      );
      if (onManagedSubmit) {
        onManagedSubmit(values);
        return;
      }
      const controller = new AbortController();
      const submittedNavigationToken = navigationToken;
      const submittedLocation = window.location.href;
      activeRequest.current = controller;
      setPending(true);
      void submitManagedForm({
        values,
        managedFormId: managedFormId!,
        location: submittedLocation,
        signal: controller.signal,
      })
        .then((response) => {
          if (
            controller.signal.aborted ||
            submittedNavigationToken !== currentNavigationToken.current ||
            submittedLocation !== window.location.href
          ) {
            return;
          }
          setPending(false);
          setResult(response);
          onResultChange?.(response);
          reportState(response.success ? "success" : "error");
          const destination = response.success
            ? resolveRedirectUrl(successRedirect, window.location.href)
            : undefined;
          if (destination) {
            window.location.assign(destination);
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
        .catch(() => {
          // Unmounting aborts a request without reporting a submission error.
        })
        .finally(() => {
          if (activeRequest.current === controller) {
            activeRequest.current = undefined;
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
        {(error ||
          (configurationError === emptyFormDestinationMessage
            ? undefined
            : configurationError)) && (
          <div role="alert" data-ws-form-feedback="">
            {error ?? configurationError}
          </div>
        )}
        {result?.errors.map((failure, index) => (
          <div
            role="alert"
            data-ws-form-feedback=""
            key={index}
            style={pending ? { display: "none" } : undefined}
          >
            {failure.message}
          </div>
        ))}
      </form>
    );
  }
);

NativeForm.displayName = "NativeForm";
