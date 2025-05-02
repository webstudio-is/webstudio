import { type ElementRef, type ComponentProps, forwardRef } from "react";
import { Form, type FormProps } from "@remix-run/react";

export const defaultTag = "form";

export const RemixForm = forwardRef<
  ElementRef<typeof defaultTag>,
  Omit<ComponentProps<typeof defaultTag>, "action"> &
    Pick<FormProps, "encType"> & {
      // Remix's default behavior includes method values in both uppercase and lowercase,
      // resulting in our UI displaying a list that encompasses both variants.
      method?: Lowercase<NonNullable<FormProps["method"]>>;
      action?: string;
    }
>(({ action, ...props }, ref) => {
  // remix casts action to relative url
  if (
    action === undefined ||
    action === "" ||
    (typeof action === "string" && action?.startsWith("/"))
  ) {
    return (
      <Form
        action={action}
        {...props}
        ref={ref}
        // Preserve scroll position for navigation on the same path, as it's used for filtering and sorting
        preventScrollReset={action === undefined || action === ""}
      />
    );
  }
  return <form {...props} ref={ref} />;
});

RemixForm.displayName = "Form";
