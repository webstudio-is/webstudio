import { forwardRef, type ComponentProps, type ElementRef } from "react";
import { useFetcher, useLocation } from "react-router";
import {
  createManagedSubmissionFormData,
  type getFormDataValue,
  useManagedFormResult,
} from "@webstudio-is/sdk-components-react";
import { managedFormRequestParamName } from "@webstudio-is/sdk";
import { NativeForm as BaseNativeForm } from "@webstudio-is/sdk-components-react/components";

type Props = ComponentProps<typeof BaseNativeForm> & {
  "data-ws-managed-form-id"?: string;
};

export const NativeForm = forwardRef<ElementRef<typeof BaseNativeForm>, Props>(
  (
    {
      "data-ws-managed-form-id": managedFormId,
      onStateChange,
      successRedirect,
      state,
      onManagedSubmit,
      children,
      ...props
    },
    ref
  ) => {
    const fetcher = useFetcher<{ success: boolean; errors?: string[] }>();
    const location = useLocation();
    useManagedFormResult({
      state: fetcher.state,
      data: fetcher.data,
      onStateChange,
      successRedirect,
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
        onStateChange={onStateChange}
        ref={ref}
        onManagedSubmit={
          managedFormId === undefined ? undefined : handleManagedSubmit
        }
      >
        {children}
        {fetcher.data?.errors?.map((error, index) => (
          <div role="alert" key={index}>
            {error}
          </div>
        ))}
      </BaseNativeForm>
    );
  }
);

NativeForm.displayName = "NativeForm";
