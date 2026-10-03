import { forwardRef, type ComponentProps, type ElementRef } from "react";
import { useFetcher, useLocation } from "@remix-run/react";
import {
  createManagedSubmissionFormData,
  type ManagedFormActionResult,
  type getFormDataValue,
  useManagedFormResult,
  useFormFeedbackScroll,
} from "@webstudio-is/sdk-components-react";
import { managedFormRequestParamName } from "@webstudio-is/sdk/form-fields";
import { NativeForm as BaseNativeForm } from "@webstudio-is/sdk-components-react/components";

type Props = ComponentProps<typeof BaseNativeForm> & {
  "data-ws-managed-form-id"?: string;
};

export const NativeForm = forwardRef<ElementRef<typeof BaseNativeForm>, Props>(
  (
    {
      "data-ws-managed-form-id": managedFormId,
      onStateChange,
      onResultChange,
      successRedirect,
      state,
      onManagedSubmit,
      children,
      ...props
    },
    ref
  ) => {
    const fetcher = useFetcher<ManagedFormActionResult>();
    const location = useLocation();
    const { setFormRef, prepareFeedback, revealFeedback } =
      useFormFeedbackScroll(ref, state);
    useManagedFormResult({
      state: fetcher.state,
      data: fetcher.data as ManagedFormActionResult | undefined,
      onStateChange,
      onResultChange,
      successRedirect,
      revealFeedback,
    });
    const handleManagedSubmit = (
      values: ReturnType<typeof getFormDataValue>
    ) => {
      onManagedSubmit?.(values);
      if (managedFormId === undefined) {
        return;
      }
      const search = new URLSearchParams(location.search);
      search.set(managedFormRequestParamName, "1");
      fetcher.submit(
        createManagedSubmissionFormData({ values, managedFormId }),
        {
          action: `${location.pathname}?${search.toString()}`,
          method: "post",
          encType: "multipart/form-data",
        }
      );
    };

    return (
      <BaseNativeForm
        {...props}
        data-ws-managed-form-id={managedFormId}
        state={state}
        onStateChange={(nextState) => {
          onStateChange?.(nextState);
          if (nextState === "error") {
            revealFeedback();
          }
        }}
        onResultChange={onResultChange}
        ref={setFormRef}
        onSubmit={(event) => {
          props.onSubmit?.(event);
          if (!event.defaultPrevented) {
            prepareFeedback();
          }
        }}
        onManagedSubmit={
          managedFormId === undefined ? undefined : handleManagedSubmit
        }
      >
        {children}
        {fetcher.data?.errors?.map((error, index) => (
          <div role="alert" data-ws-form-feedback="" key={index}>
            {typeof error === "string" ? error : error.message}
          </div>
        ))}
      </BaseNativeForm>
    );
  }
);

NativeForm.displayName = "NativeForm";
