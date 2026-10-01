import { type ElementRef, type ComponentProps, forwardRef } from "react";
import { useFetcher, type FormProps } from "react-router";
import { formIdFieldName, formBotFieldName } from "@webstudio-is/sdk/runtime";
import {
  useWebhookForm,
  type WebhookFormState,
  type WebhookFormResult,
} from "@webstudio-is/react-sdk/runtime";

export const defaultTag = "form";

export const WebhookForm = forwardRef<
  ElementRef<typeof defaultTag>,
  Omit<ComponentProps<typeof defaultTag>, "action"> & {
    /** Use this property to reveal the Success and Error states on the canvas so they can be styled. The Initial state is displayed when the page first opens. The Success and Error states are displayed depending on whether the Form submits successfully or unsuccessfully. */
    state?: WebhookFormState;
    encType?: FormProps["encType"];
    onStateChange?: (state: WebhookFormState) => void;
    action?: string;
    successRedirect?: string;
  }
>(
  (
    {
      children,
      action,
      method,
      successRedirect,
      state = "initial",
      onStateChange,
      onSubmit,
      ...rest
    },
    ref
  ) => {
    const fetcher = useFetcher<WebhookFormResult>();
    const { botInputRef, handleSubmit } = useWebhookForm({
      state: fetcher.state,
      data: fetcher.data,
      onStateChange,
      successRedirect,
      onSubmit,
    });

    return (
      <fetcher.Form
        {...rest}
        method="post"
        data-state={state}
        ref={ref}
        onSubmit={handleSubmit}
      >
        <input
          type="hidden"
          name={formIdFieldName}
          value={action?.toString()}
        />
        <input type="hidden" name={formBotFieldName} ref={botInputRef} />
        {children}
        {fetcher.state === "idle" && fetcher.data?.partialSuccess && (
          <p role="alert">
            Some deliveries succeeded. Submitting again may send them twice.
          </p>
        )}
      </fetcher.Form>
    );
  }
);

WebhookForm.displayName = "WebhookForm";
