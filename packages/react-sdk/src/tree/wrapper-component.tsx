import { Fragment } from "react";
import type { Instance } from "@webstudio-is/project-build";
import type { GetComponent } from "../components/components-utils";
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

export const renderWrapperComponentChildren = (
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

type WrapperComponentProps = {
  instance: Instance;
  children: Array<JSX.Element | string>;
  getComponent: GetComponent;
};

export const WrapperComponent = ({
  instance,
  children,
  getComponent,
  ...rest
}: WrapperComponentProps) => {
  const instanceProps = useInstanceProps(instance.id);
  const props = {
    ...instanceProps,
    ...rest,
    [idAttribute]: instance.id,
    [componentAttribute]: instance.component,
  };
  const Component = getComponent(instance.component);
  if (Component === undefined) {
    return <></>;
  }
  return (
    <Component {...props}>{renderWrapperComponentChildren(children)}</Component>
  );
};

export const idAttribute = "data-ws-id";
export const componentAttribute = "data-ws-component";
export const collapsedAttribute = "data-ws-collapsed";
