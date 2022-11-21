import type { ComponentProps, ReactNode } from "react";
import { Fragment } from "react";
import type { Instance } from "../db";
import { WrapperComponent } from "./wrapper-component";

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
  instance,
  Component,
  scripts,
  onChangeChildren,
}: {
  instance: Instance;
  Component: (props: ComponentProps<typeof WrapperComponent>) => JSX.Element;
  scripts?: ReactNode;
  onChangeChildren?: OnChangeChildren;
}) => {
  const children = createInstanceChildrenElements({
    Component,
    children: instance.children,
    onChangeChildren,
  });
  const body = createInstanceElement({
    Component,
    instance,
    children: [
      <Fragment key="children">
        {children}
        {scripts}
      </Fragment>,
    ],
  });
  return body;
};

const createInstanceChildrenElements = ({
  children,
  Component,
  onChangeChildren,
}: {
  children: Instance["children"];
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
      Component,
      onChangeChildren,
    });
    const element = createInstanceElement({
      instance: child,
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
  onChangeChildren,
}: {
  instance: Instance;
  Component: (props: ComponentProps<typeof WrapperComponent>) => JSX.Element;
  onChangeChildren?: OnChangeChildren;
  children?: Array<JSX.Element | string>;
}) => {
  const props = {
    instance,
    children,
    key: instance.id,
    onChangeChildren,
  };

  return <Component {...props} />;
};
