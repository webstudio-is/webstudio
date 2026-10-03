import {
  forwardRef,
  useEffect,
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
import { getFormDataValue } from "./form-submission";

export const defaultTag = "form";

export const NativeForm = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> & {
    submission?: unknown;
    successRedirect?: string;
    state?: "initial" | "success" | "error";
    onStateChange?: (state: "initial" | "success" | "error") => void;
    onResultChange?: (result: ManagedFormResponse) => void;
    onManagedSubmit?: (formData: ReturnType<typeof getFormDataValue>) => void;
    // These parameters define Resource expression scope in Builder.
    formData?: unknown;
    browserInfo?: unknown;
  }
>(
  (
    {
      id,
      submission,
      state,
      onStateChange,
      onResultChange,
      onManagedSubmit,
      onSubmit,
      formData,
      browserInfo,
      children,
      ...props
    },
    ref
  ) => {
    const [error, setError] = useState<string>();
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
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
      if (configurationError) {
        setError(configurationError);
        onResultChange?.({
          success: false,
          status: 400,
          results: [],
          errors: [{ status: 400, body: null, message: configurationError }],
        });
        onStateChange?.("error");
        return;
      }
      if (onManagedSubmit === undefined) {
        setError("Resource submission is unavailable");
        onResultChange?.({
          success: false,
          status: 400,
          results: [],
          errors: [
            {
              status: 400,
              body: null,
              message: "Resource submission is unavailable",
            },
          ],
        });
        onStateChange?.("error");
        return;
      }
      setError(undefined);
      onStateChange?.("initial");
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      onManagedSubmit(
        getFormDataValue(
          event.currentTarget,
          submitter instanceof HTMLElement ? submitter : undefined
        )
      );
    };
    return (
      <form
        {...props}
        id={hydrated ? id : undefined}
        data-state={state}
        action={undefined}
        method="dialog"
        encType={undefined}
        ref={ref}
        onSubmit={handleManagedSubmit}
      >
        <fieldset disabled={!hydrated} style={{ display: "contents" }}>
          <div style={{ display: "contents" }}>{children}</div>
        </fieldset>
        {(configurationError || error) && (
          <div role="alert" data-ws-form-feedback="">
            {error ?? configurationError}
          </div>
        )}
      </form>
    );
  }
);

NativeForm.displayName = "NativeForm";
