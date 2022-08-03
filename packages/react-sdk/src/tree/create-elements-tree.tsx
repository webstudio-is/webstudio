import { Fragment } from "react";
import { toCss } from "../stitches";
import type { Instance } from "../db";
import type { Breakpoint } from "../css";
import { type WrapperComponentProps } from "./wrapper-component";
import { Scripts, ScrollRestoration } from "@remix-run/react";

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
}) => {
  const children = createInstanceChildrenElements({
    Component,
    children: instance.children,
    breakpoints,
    onChangeChildren,
  });
  const body = createInstanceElement({
    Component,
    instance,
    children: [
      <Fragment key="children">
        {children}
        <ScrollRestoration />
        <Scripts />
      </Fragment>,
    ],
    breakpoints,
  });
  return body;
};

const createInstanceChildrenElements = ({
  children,
  breakpoints,
  Component,
  onChangeChildren,
}: {
  children: Instance["children"];
  breakpoints: Array<Breakpoint>;
  Component: (props: WrapperComponentProps) => JSX.Element;
  onChangeChildren?: OnChangeChildren;
}) => {
  const elements = [];
  for (const child of children) {
    if (typeof child === "string") {
      elements.push(child);
      continue;
    }
    const element = createInstanceElement({
      instance: child,
      breakpoints,
      Component,
      onChangeChildren,
    });
    elements.push(element);
  }
  return elements;
};

const createInstanceElement = ({
  Component,
  instance,
  children = [],
  breakpoints,
  onChangeChildren,
}: {
  instance: Instance;
  breakpoints: Array<Breakpoint>;
  Component: (props: WrapperComponentProps) => JSX.Element;
  onChangeChildren?: OnChangeChildren;
  children?: Array<JSX.Element>;
}) => {
  const props = {
    instance,
    children,
    css: toCss(instance.cssRules, breakpoints),
    key: instance.id,
    onChangeChildren,
  };

  return <Component {...props} />;
};
