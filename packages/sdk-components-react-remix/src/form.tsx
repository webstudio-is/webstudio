import {
  type ReactNode,
  type ElementRef,
  type ComponentProps,
  Children,
  cloneElement,
  forwardRef,
} from "react";
import { useFetcher } from "@remix-run/react";
import { formIdFieldName } from "@webstudio-is/form-handlers";
import { getInstanceIdFromComponentProps } from "@webstudio-is/react-sdk";

export const defaultTag = "form";

const isComponentNode = (
  component: string,
  node: Exclude<ReactNode, null | number | string | boolean | undefined>
) => "props" in node && node.props.instance?.component === component;

const onlyErrorMessage = (children: ReactNode) =>
  Children.map(children, (child): ReactNode => {
    if (typeof child !== "object" || child === null) {
      return null;
    }

    if (isComponentNode("ErrorMessage", child)) {
      return child;
    }

    if ("props" in child) {
      const newChildren = onlyErrorMessage(child.props.children);
      return Children.toArray(newChildren).some((child) => child !== null)
        ? cloneElement(child, { children: newChildren })
        : null;
    }

    return onlyErrorMessage(child);
  });

const onlySuccessMessage = (children: ReactNode) =>
  Children.map(children, (child): ReactNode => {
    if (typeof child !== "object" || child === null) {
      return null;
    }

    if (isComponentNode("SuccessMessage", child)) {
      return child;
    }

    if ("props" in child) {
      const newChildren = onlySuccessMessage(child.props.children);
      return Children.toArray(newChildren).some((child) => child !== null)
        ? cloneElement(child, { children: newChildren })
        : null;
    }

    return onlySuccessMessage(child);
  });

const withoutMessages = (children: ReactNode) =>
  Children.map(children, (child): ReactNode => {
    if (typeof child !== "object" || child === null) {
      return child;
    }

    if (
      isComponentNode("ErrorMessage", child) ||
      isComponentNode("SuccessMessage", child)
    ) {
      return null;
    }

    if ("props" in child) {
      return cloneElement(child, {
        children: withoutMessages(child.props.children),
      });
    }

    return withoutMessages(child);
  });

export const Form = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> & {
    initialState?: "initial" | "success" | "error";
  }
>(({ children, initialState = "initial", action, method, ...props }, ref) => {
  const fetcher = useFetcher();

  const state =
    fetcher.type === "done"
      ? fetcher.data?.success === true
        ? "success"
        : "error"
      : initialState;

  const instanceId = getInstanceIdFromComponentProps(props);

  return (
    <fetcher.Form {...props} method="post" data-state={state} ref={ref}>
      <input type="hidden" name={formIdFieldName} value={instanceId} />
      {state === "success"
        ? onlySuccessMessage(children)
        : state === "error"
        ? onlyErrorMessage(children)
        : withoutMessages(children)}
    </fetcher.Form>
  );
});

Form.displayName = "Form";
