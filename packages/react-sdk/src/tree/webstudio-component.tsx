import { Fragment } from "react";
import type { Instance } from "@webstudio-is/sdk";
import type { Components } from "../components/components-utils";

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

export const idAttribute = "data-ws-id" as const;
export const selectorIdAttribute = "data-ws-selector" as const;
export const componentAttribute = "data-ws-component" as const;
export const showAttribute = "data-ws-show" as const;
export const indexAttribute = "data-ws-index" as const;
export const collapsedAttribute = "data-ws-collapsed" as const;
