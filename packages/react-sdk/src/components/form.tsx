import { Children, cloneElement, type ReactNode } from "react";
import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "form";

const isComponentNode = (component: string, node: ReactNode) =>
  typeof node === "object" &&
  node !== null &&
  "props" in node &&
  node.props.instance?.component === component;

const isComponentNodeOrItsParent = (
  component: string,
  node: ReactNode
): boolean => {
  if (typeof node !== "object" || node === null) {
    return false;
  }

  if (isComponentNode(component, node)) {
    return true;
  }

  const containsComponent = (nodes: Iterable<ReactNode>) => {
    for (const node of nodes) {
      if (isComponentNodeOrItsParent(component, node)) {
        return true;
      }
    }
    return false;
  };

  if ("props" in node) {
    return containsComponent(Children.toArray(node.props.children));
  }

  return containsComponent(node);
};

const onlyErrorMessage = (children: ReactNode) =>
  Children.toArray(children).filter((child) =>
    isComponentNodeOrItsParent("ErrorMessage", child)
  );

const onlySuccessMessage = (children: ReactNode) =>
  Children.toArray(children).filter((child) =>
    isComponentNodeOrItsParent("SuccessMessage", child)
  );

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

    // Here `child` is ReactFragment which is Iterable<ReactNode>,
    // so we pass it directly to the next recursive step,
    // but I'm not 100% sure this is correct way to recurse over fragments
    return withoutMessages(child);
  });

export const Form = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag> & {
    initialState?: "initial" | "success" | "error";
  }
>(({ children, initialState, ...props }, ref) => (
  <form {...props} ref={ref}>
    {initialState === "success"
      ? onlySuccessMessage(children)
      : initialState === "error"
      ? onlyErrorMessage(children)
      : withoutMessages(children)}
  </form>
));

Form.displayName = "Form";
