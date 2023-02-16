import { type ComponentProps, Fragment } from "react";
import type { ReadableAtom } from "nanostores";
import { Scripts, ScrollRestoration } from "@remix-run/react";
import type { Instance } from "@webstudio-is/project-build";
import { ReactSdkContext } from "../context";
import type { Assets, PropsByInstanceId } from "../props";
import type { WrapperComponent } from "./wrapper-component";
import { SessionStoragePolyfill } from "./session-storage-polyfill";

export const createElementsTree = ({
  sandbox,
  instance,
  propsByInstanceIdStore,
  assetsStore,
  Component,
}: {
  sandbox?: boolean;
  instance: Instance;
  propsByInstanceIdStore: ReadableAtom<PropsByInstanceId>;
  assetsStore: ReadableAtom<Assets>;
  Component: (props: ComponentProps<typeof WrapperComponent>) => JSX.Element;
}) => {
  const children = createInstanceChildrenElements({
    Component,
    children: instance.children,
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
}: {
  children: Instance["children"];
  Component: (props: ComponentProps<typeof WrapperComponent>) => JSX.Element;
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
    });
    const element = createInstanceElement({
      instance: child,
      Component,
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
}: {
  instance: Instance;
  Component: (props: ComponentProps<typeof WrapperComponent>) => JSX.Element;
  children?: Array<JSX.Element | string>;
}) => {
  const props = {
    instance,
    children,
    key: instance.id,
  };

  return <Component {...props} />;
};
