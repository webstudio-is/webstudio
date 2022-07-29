import React from "react";
import { toCss } from "../stitches";
import type { Instance } from "../db";
import type { Breakpoint } from "../css";
import { type WrapperComponentProps } from "./wrapper-component";

export type ChildrenUpdates = Array<
  | string
  // Updates an instance child
  | { id: Instance["id"]; text: string }
  // Creates a new child instance
  | {
      id: Instance["id"];
      text: string;
      component: Instance["component"];
      createInstance: true;
    }
>;

export type OnChangeChildren = (change: {
  instanceId: Instance["id"];
  updates: ChildrenUpdates;
}) => void;

export const createElementsTree = ({
  instance,
  breakpoints,
  Component,
  onChangeChildren,
}: {
  instance: Instance;
  breakpoints: Array<Breakpoint>;
  Component: (props: WrapperComponentProps) => JSX.Element;
  onChangeChildren?: OnChangeChildren;
}): JSX.Element => {
  const children: Array<string | JSX.Element> = [];

  for (const child of instance.children) {
    const element =
      typeof child === "string"
        ? child
        : createElementsTree({
            instance: child,
            breakpoints,
            Component,
            onChangeChildren,
          });
    children.push(element);
  }

  //if (instance.component === "Body") {
  //  return children;
  //}

  const props = {
    instance,
    children,
    css: toCss(instance.cssRules, breakpoints),
    key: instance.id,
    onChangeChildren,
  };
  return <Component {...props} />;
};
