import { type ComponentProps, Fragment } from "react";
import type { Instance } from "../db";
import type { Breakpoint } from "../css";
import { WrapperComponent } from "./wrapper-component";
import { Scripts, ScrollRestoration } from "@remix-run/react";
import { SessionStoragePolyfill } from "./session-storage-polyfill";

export type ChildrenUpdates = Array<
  | string
  | {
      id: undefined | Instance["id"];
      component: Instance["component"];
      children: ChildrenUpdates;
    }
>;

export type OnChangeChildren = (change: {
  instanceId: Instance["id"];
  updates: ChildrenUpdates;
}) => void;

export const createElementsTree = ({
  sandbox,
  instance,
  breakpoints,
  Component,
  onChangeChildren,
}: {
  sandbox?: boolean;
  instance: Instance;
  breakpoints: Array<Breakpoint>;
  Component: (props: ComponentProps<typeof WrapperComponent>) => JSX.Element;
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
        {sandbox && <SessionStoragePolyfill />}
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
  Component: (props: ComponentProps<typeof WrapperComponent>) => JSX.Element;
  onChangeChildren?: OnChangeChildren;
}) => {
  const elements = [];
  for (const child of children) {
    if (typeof child === "string") {
      elements.push(child);
      continue;
    }
    const children = createInstanceChildrenElements({
      children: child.children,
      breakpoints,
      Component,
      onChangeChildren,
    });
    const element = createInstanceElement({
      instance: child,
      breakpoints,
      Component,
      onChangeChildren,
      children,
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
  Component: (props: ComponentProps<typeof WrapperComponent>) => JSX.Element;
  onChangeChildren?: OnChangeChildren;
  children?: Array<JSX.Element | string>;
}) => {
  const props = {
    instance,
    breakpoints,
    children,
    key: instance.id,
    onChangeChildren,
  };

  return <Component {...props} />;
};
