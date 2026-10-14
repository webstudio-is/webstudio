import { forwardRef, type ComponentProps, type ElementRef } from "react";
import {
  useLocation,
  useNavigate,
  useNavigation,
  useRevalidator,
} from "react-router";
import { Form as SharedForm } from "@webstudio-is/sdk-components-react/components";

export const Form = forwardRef<
  ElementRef<typeof SharedForm>,
  ComponentProps<typeof SharedForm>
>((props, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const navigationToken = `${location.key}:${navigation.location?.key ?? ""}`;

  const revalidate = async () => {
    await revalidator.revalidate();
    // React Router restores the previous scroll position after revalidation.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  };

  return (
    <SharedForm
      {...props}
      ref={ref}
      navigationToken={navigationToken}
      onSubmissionSuccess={revalidate}
      onQueryNavigate={(url) => {
        const destination = new URL(url, window.location.href);
        navigate(
          {
            pathname: location.pathname,
            search: destination.search,
            hash: destination.hash,
          },
          { preventScrollReset: true }
        );
      }}
    />
  );
});

Form.displayName = "Form";
