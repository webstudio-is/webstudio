import { type ElementRef, type ComponentProps, forwardRef } from "react";
import { Form, type FormProps } from "@remix-run/react";

export const defaultTag = "form";

export const RemixForm = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> &
    Pick<FormProps, "encType"> & {
      // Remix's default behavior includes method values in both uppercase and lowercase,
      // resulting in our UI displaying a list that encompasses both variants.
      method?: Lowercase<NonNullable<FormProps["method"]>>;
    }
>((props, ref) => {
  // remix casts action to relative url
  if (props.action === "" || props.action?.startsWith("/")) {
    return <Form {...props} ref={ref} />;
  }
  return <form {...props} ref={ref} />;
});

RemixForm.displayName = "Form";
