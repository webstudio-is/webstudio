import {
  type ElementRef,
  type ComponentProps,
  forwardRef,
  useContext,
} from "react";
import { Form, type FormProps } from "@remix-run/react";
import { ReactSdkContext } from "@webstudio-is/react-sdk";

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
  const { renderer } = useContext(ReactSdkContext);
  // remix casts action to relative url
  if (
    props.action === undefined ||
    props.action === "" ||
    props.action?.startsWith("/")
  ) {
    // remix forms specifies own action instead of provided one
    // which makes it hard to handle intercepted submit events
    // render remix form only in published sites
    if (renderer !== "canvas" && renderer !== "preview") {
      return <Form {...props} ref={ref} />;
    }
  }
  return <form {...props} ref={ref} />;
});

RemixForm.displayName = "Form";
