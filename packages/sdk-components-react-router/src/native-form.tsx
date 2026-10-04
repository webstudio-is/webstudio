import { forwardRef, type ComponentProps, type ElementRef } from "react";
import { useLocation, useNavigation, useRevalidator } from "react-router";
import { NativeForm as SharedNativeForm } from "@webstudio-is/sdk-components-react/components";

export const NativeForm = forwardRef<
  ElementRef<typeof SharedNativeForm>,
  ComponentProps<typeof SharedNativeForm>
>((props, ref) => {
  const location = useLocation();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const navigationToken = `${location.key}:${navigation.location?.key ?? ""}`;

  return (
    <SharedNativeForm
      {...props}
      ref={ref}
      navigationToken={navigationToken}
      onSubmissionSuccess={() => revalidator.revalidate()}
    />
  );
});

NativeForm.displayName = "NativeForm";
