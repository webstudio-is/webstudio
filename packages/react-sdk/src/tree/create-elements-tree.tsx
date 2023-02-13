import { type ComponentProps, Fragment } from "react";
import { ReadableAtom } from "nanostores";
import { Scripts, ScrollRestoration } from "@remix-run/react";
import type { Instance } from "@webstudio-is/project-build";
import { ReactSdkContext } from "../context";
import { Assets, PropsByInstanceId } from "../props";
import { WrapperComponent } from "./wrapper-component";
import { SessionStoragePolyfill } from "./session-storage-polyfill";

export type ChildrenUpdates = Array<
  | {
      type: "text";
      value: string;
    }
  | {
      type: "instance";
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
  propsByInstanceIdStore,
  assetsStore,
  Component,
  onChangeChildren,
}: {
  sandbox?: boolean;
  instance: Instance;
  propsByInstanceIdStore: ReadableAtom<PropsByInstanceId>;
  assetsStore: ReadableAtom<Assets>;
  Component: (props: ComponentProps<typeof WrapperComponent>) => JSX.Element;
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
        {sandbox && <SessionStoragePolyfill />}
        <ScrollRestoration />
        <Scripts />
      </Fragment>,
    ],
  });
  return (
    <ReactSdkContext.Provider value={{ propsByInstanceIdStore, assetsStore }}>
      {body}
    </ReactSdkContext.Provider>
  );
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
    if (child.type === "text") {
      elements.push(child.value);
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
