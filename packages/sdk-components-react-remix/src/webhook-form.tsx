import { type ElementRef, type ComponentProps, forwardRef } from "react";
import {
  useLocation,
  useNavigation,
  useRevalidator,
  type FormProps,
} from "@remix-run/react";
import { formIdFieldName } from "@webstudio-is/sdk/runtime";
import {
  useLegacyWebhookSubmission,
  type LegacyWebhookState,
} from "@webstudio-is/sdk-components-react";

export const defaultTag = "form";

export const WebhookForm = forwardRef<
  ElementRef<typeof defaultTag>,
  Omit<ComponentProps<typeof defaultTag>, "action"> & {
    /** Use this property to reveal the Success and Error states on the canvas so they can be styled. The Initial state is displayed when the page first opens. The Success and Error states are displayed depending on whether the Form submits successfully or unsuccessfully. */
    state?: LegacyWebhookState;
    encType?: FormProps["encType"];
    onStateChange?: (state: LegacyWebhookState) => void;
    successRedirect?: string;
    action?: string;
  }
>(
  (
    {
      children,
      action,
      method,
      state,
      onStateChange,
      successRedirect,
      ...rest
    },
    ref
  ) => {
    const location = useLocation();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const submission = useLegacyWebhookSubmission({
      state,
      onStateChange,
      successRedirect,
      forwardedRef: ref,
      navigationToken: `${location.key}:${navigation.location?.key ?? ""}`,
      onSubmissionSuccess: () => revalidator.revalidate(),
    });

    return (
      <form
        {...rest}
        method="post"
        data-state={submission.state}
        aria-busy={submission.pending || undefined}
        ref={submission.setFormRef}
        onSubmit={submission.handleSubmit}
      >
        <input
          type="hidden"
          name={formIdFieldName}
          value={action?.toString()}
        />
        {children}
      </form>
    );
  }
);

WebhookForm.displayName = "WebhookForm";
