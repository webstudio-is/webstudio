import { Fragment, forwardRef } from "react";
import type { Instance } from "@webstudio-is/project-build";
import type { Components } from "../components/components-utils";
import { useInstanceProps } from "../props";

const renderText = (text: string): Array<JSX.Element> => {
  const lines = text.split("\n");
  return lines.map((line, index) => (
    <Fragment key={index}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
};

export const renderWebstudioComponentChildren = (
  children: Array<JSX.Element | string> | undefined
): Array<JSX.Element | string | Array<JSX.Element | string>> | undefined => {
  // Some elements like input can't have children
  // @todo needs to be made impossible to drag element into input
  if (children === undefined || children.length === 0) {
    return;
  }
  return children.map((child) => {
    return typeof child === "string" ? renderText(child) : child;
  });
};

export type WebstudioComponentProps = {
  instance: Instance;
  instanceSelector: Instance["id"][];
  children: Array<JSX.Element | string>;
  components: Components;
};

// eslint-disable-next-line react/display-name
export const WebstudioComponent = forwardRef<
  HTMLElement,
  WebstudioComponentProps
>(({ instance, instanceSelector, children, components, ...rest }, ref) => {
  const { [showAttribute]: show = true, ...instanceProps } = useInstanceProps(
    instance.id
  );
  const props = {
    ...instanceProps,
    ...rest,
    [idAttribute]: instance.id,
    [componentAttribute]: instance.component,
  };
  if (show === false) {
    return <></>;
  }
  const Component = components.get(instance.component);
  if (Component === undefined) {
    return <></>;
  }
  return (
    <Component {...props} ref={ref}>
      {renderWebstudioComponentChildren(children)}
    </Component>
  );
});

export const idAttribute = "data-ws-id" as const;
export const selectorIdAttribute = "data-ws-selector" as const;
export const componentAttribute = "data-ws-component" as const;
export const showAttribute = "data-ws-show" as const;
export const collapsedAttribute = "data-ws-collapsed" as const;

export type WebstudioAttributes = {
  [idAttribute]?: string | undefined;
  [selectorIdAttribute]?: string | undefined;
  [componentAttribute]?: string | undefined;
  [showAttribute]?: string | undefined;
  [collapsedAttribute]?: string | undefined;
};

export const splitPropsWithWebstudioAttributes = <
  P extends WebstudioAttributes
>({
  [idAttribute]: idAttributeValue,
  [componentAttribute]: componentAttributeValue,
  [showAttribute]: showAttributeValue,
  [collapsedAttribute]: collapsedAttributeValue,
  [selectorIdAttribute]: parentIdAttributeValue,
  ...props
}: P): [WebstudioAttributes, Omit<P, keyof WebstudioAttributes>] => [
  {
    [idAttribute]: idAttributeValue,
    [componentAttribute]: componentAttributeValue,
    [showAttribute]: showAttributeValue,
    [collapsedAttribute]: collapsedAttributeValue,
    [selectorIdAttribute]: parentIdAttributeValue,
  },
  props,
];
