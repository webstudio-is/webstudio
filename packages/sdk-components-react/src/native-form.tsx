import {
  forwardRef,
  useState,
  type ComponentProps,
  type ElementRef,
  type FormEvent,
} from "react";
import { isFormSubmission, validateFormSubmission } from "@webstudio-is/sdk";
import { getFormDataValue } from "./form-submission";

export const defaultTag = "form";

export const NativeForm = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> & {
    submission?: unknown;
    onManagedSubmit?: (formData: ReturnType<typeof getFormDataValue>) => void;
    // These parameters define Resource expression scope in Builder.
    formData?: unknown;
    browserInfo?: unknown;
  }
>(
  (
    {
      submission,
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
    const validSubmission = isFormSubmission(submission);
    const managed =
      submission !== undefined &&
      (validSubmission === false || submission.mode === "resources");
    const configurationError =
      submission !== undefined && validSubmission === false
        ? "Invalid Form submission settings"
        : validSubmission
          ? validateFormSubmission(submission)
          : undefined;
    const handleManagedSubmit = (event: FormEvent<HTMLFormElement>) => {
      onSubmit?.(event);
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      if (configurationError) {
        setError(configurationError);
        return;
      }
      if (onManagedSubmit === undefined) {
        setError("Resource submission is unavailable");
        return;
      }
      setError(undefined);
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
        action={managed ? undefined : props.action}
        method={managed ? "dialog" : props.method}
        ref={ref}
        onSubmit={managed ? handleManagedSubmit : onSubmit}
      >
        {children}
        {(configurationError || error) && (
          <div role="alert">{error ?? configurationError}</div>
        )}
      </form>
    );
  }
);

NativeForm.displayName = "NativeForm";
