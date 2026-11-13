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
  navigationFormActionUrl,
  resourceFormActionUrl,
  validateFormSubmission,
} from "@webstudio-is/sdk/form-submission";
import type { ManagedFormResponse } from "@webstudio-is/sdk/runtime";
import {
  FormSubmissionController,
  getFormDataEntries,
  getFormDataValue,
  submitManagedForm,
  type FormSubmissionCallbacks,
  type FormProgress,
  type UploadProgress,
} from "@webstudio-is/sdk/form/browser";
import { useFormFeedbackScroll } from "./form-feedback-scroll";

export const defaultTag = "form";

const createIdleProgress = (): FormProgress => ({
  status: "idle",
  loaded: 0,
  total: 0,
  files: [],
});

export const ResourceForm = forwardRef<
  ElementRef<typeof defaultTag>,
  Omit<ComponentProps<typeof defaultTag>, "action"> & {
    action?: unknown;
    "data-ws-managed-form-id"?: string;
    successRedirect?: string;
    state?: "initial" | "success" | "error";
    onStateChange?: (state: "initial" | "success" | "error") => void;
    onResultChange?: (result: ManagedFormResponse) => void;
    onProgressChange?: (progress: FormProgress) => void;
    onManagedSubmit?: (
      formData: ReturnType<typeof getFormDataValue>,
      signal: AbortSignal,
      onUploadProgress?: (progress: UploadProgress) => void
    ) => void | Promise<ManagedFormResponse>;
    onQueryNavigate?: (url: string) => void;
    getRedirectBaseUrl?: () => string;
    onSuccessRedirect?: (destination: string) => boolean | void;
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
      onProgressChange,
      onManagedSubmit,
      onQueryNavigate,
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
    const callbacks = useRef<FormSubmissionCallbacks>();
    const progress = useRef<FormProgress>(createIdleProgress());
    const uploadController = useRef<AbortController>();
    const submissionController = useRef<FormSubmissionController>();
    submissionController.current ??= new FormSubmissionController(
      () => callbacks.current!
    );
    const { formRef, setFormRef, revealFeedback } = useFormFeedbackScroll(ref);
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    useEffect(() => {
      // StrictMode replays effect setup after cleanup without remounting refs.
      if (submissionController.current?.isDisposed) {
        submissionController.current = new FormSubmissionController(
          () => callbacks.current!
        );
      }
      return () => {
        const wasPending = progress.current.status === "pending";
        submissionController.current?.dispose();
        if (wasPending) {
          callbacks.current?.onCancel?.();
        }
      };
    }, []);
    const previousNavigationToken = useRef(navigationToken);
    const currentNavigationToken = useRef(navigationToken);
    currentNavigationToken.current = navigationToken;
    useEffect(() => {
      if (previousNavigationToken.current !== navigationToken) {
        submissionController.current?.cancel();
        previousNavigationToken.current = navigationToken;
      }
    }, [navigationToken]);
    const reportState = (nextState: "initial" | "success" | "error") => {
      setInternalState(nextState);
      onStateChange?.(nextState);
    };
    const reportProgress = (nextProgress: FormProgress) => {
      progress.current = nextProgress;
      onProgressChange?.(nextProgress);
    };
    const reportUploadProgress = (
      update: UploadProgress,
      controller: AbortController
    ) => {
      if (
        controller.signal.aborted ||
        uploadController.current !== controller
      ) {
        return;
      }
      reportProgress({
        ...progress.current,
        loaded: update.loaded ?? 0,
        total: update.total ?? 0,
      });
    };
    const reportFailure = (message: string, status = 400) => {
      uploadController.current = undefined;
      reportProgress(createIdleProgress());
      onResultChange?.({
        success: false,
        status,
        results: [],
        errors: [{ status, body: null, message }],
      });
      reportState("error");
      revealFeedback();
    };
    callbacks.current = {
      onPending: (isPending) => {
        setPending(isPending);
        if (!isPending && progress.current.status === "pending") {
          uploadController.current = undefined;
          reportProgress({ ...progress.current, status: "idle" });
        }
      },
      onCancel: () => {
        uploadController.current = undefined;
        reportProgress(createIdleProgress());
      },
      onResult: (result) => onResultChange?.(result),
      onState: reportState,
      onFeedback: revealFeedback,
      onRefresh: () => {
        if (formRef.current) {
          // A field named or identified as "reset" can shadow form.reset.
          HTMLFormElement.prototype.reset.call(formRef.current);
        }
        return onSubmissionSuccess?.();
      },
      onRedirect: (destination) => {
        if (onSuccessRedirect) {
          return onSuccessRedirect(destination);
        }
        window.location.assign(destination);
        return true;
      },
      successRedirect,
      getRedirectBaseUrl: () => getRedirectBaseUrl?.() ?? window.location.href,
      getLocation: () => window.location.href,
      getNavigationToken: () => currentNavigationToken.current,
    };
    const validSubmission = isFormSubmission(action);
    const hasResourceActions = validSubmission && action.length > 0;
    const isNavigationMode =
      action === undefined || (validSubmission && action.length === 0);
    const configurationError = validSubmission
      ? hasResourceActions
        ? validateFormSubmission(action)
        : undefined
      : action === undefined
        ? undefined
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
      if (isNavigationMode) {
        if (onQueryNavigate === undefined) {
          return;
        }
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const entries = getFormDataEntries(
          event.currentTarget,
          submitter instanceof HTMLElement ? submitter : undefined
        );
        const destination = new URL(event.currentTarget.action);
        const search = new URLSearchParams();
        for (const [name, value] of entries) {
          search.append(name, value instanceof File ? value.name : value);
        }
        destination.search = search.toString();
        onQueryNavigate(
          `${destination.pathname}${destination.search}${destination.hash}`
        );
        return;
      }
      event.preventDefault();
      if (submissionController.current?.pending) {
        return;
      }
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
      let fileIndex = 0;
      const files = Object.entries(values).flatMap(([fieldName, value]) =>
        (Array.isArray(value) ? value : [value])
          .filter(
            (entry): entry is File =>
              entry instanceof File && !(entry.name === "" && entry.size === 0)
          )
          .map((file) => ({
            id: String(fileIndex++),
            fieldName,
            name: file.name,
            size: file.size,
            type: file.type,
          }))
      );
      reportProgress({ status: "pending", loaded: 0, total: 0, files });
      const controller = new AbortController();
      uploadController.current = controller;
      const onUploadProgress = (update: UploadProgress) =>
        reportUploadProgress(update, controller);
      if (onManagedSubmit) {
        let submission: void | Promise<ManagedFormResponse>;
        try {
          submission = onManagedSubmit(
            values,
            controller.signal,
            onUploadProgress
          );
        } catch (error) {
          submission = Promise.reject(error);
        }
        if (submission === undefined) {
          uploadController.current = undefined;
          reportProgress(createIdleProgress());
          return;
        }
        return handleSubmission(submission, controller);
      }
      const submittedNavigationToken = navigationToken;
      const submittedLocation = window.location.href;
      return handleSubmission(
        submitManagedForm({
          values,
          managedFormId: managedFormId!,
          location: submittedLocation,
          signal: controller.signal,
          onUploadProgress,
        }),
        controller,
        submittedNavigationToken,
        submittedLocation
      );
    };
    const handleSubmission = (
      submission: Promise<ManagedFormResponse>,
      controller: AbortController,
      submittedNavigationToken = navigationToken,
      submittedLocation = window.location.href
    ) =>
      submissionController.current?.submit(
        submission,
        controller,
        submittedNavigationToken,
        submittedLocation
      );
    return (
      <form
        {...props}
        id={hydrated ? id : undefined}
        data-ws-managed-form-id={managedFormId}
        data-state={
          state ?? (internalState === "initial" ? undefined : internalState)
        }
        aria-busy={pending || undefined}
        action={
          hasResourceActions ? resourceFormActionUrl : navigationFormActionUrl
        }
        method={hasResourceActions ? "dialog" : "get"}
        encType={undefined}
        ref={setFormRef}
        onSubmit={handleManagedSubmit}
      >
        <fieldset disabled={!hydrated} style={{ display: "contents" }}>
          <div style={{ display: "contents" }}>{children}</div>
        </fieldset>
        {onProgressChange === undefined && (
          <output role="status" aria-live="polite">
            {pending ? "Submitting…" : ""}
          </output>
        )}
      </form>
    );
  }
);

ResourceForm.displayName = "ResourceForm";
