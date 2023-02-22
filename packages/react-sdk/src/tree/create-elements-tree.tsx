import { type ComponentProps, Fragment } from "react";
import type { ReadableAtom } from "nanostores";
import { Scripts, ScrollRestoration } from "@remix-run/react";
import type { Instance } from "@webstudio-is/project-build";
import type { GetComponent } from "../components/components-utils";
import { ReactSdkContext } from "../context";
import type { Assets, PropsByInstanceId } from "../props";
import type { WebstudioComponent } from "./webstudio-component";
import { SessionStoragePolyfill } from "./session-storage-polyfill";

export const createElementsTree = ({
  sandbox,
  instance,
  propsByInstanceIdStore,
  assetsStore,
  Component,
  getComponent,
}: {
  sandbox?: boolean;
  instance: Instance;
  propsByInstanceIdStore: ReadableAtom<PropsByInstanceId>;
  assetsStore: ReadableAtom<Assets>;
  Component: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  getComponent: GetComponent;
}) => {
  const children = createInstanceChildrenElements({
    Component,
    children: instance.children,
    getComponent,
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
    getComponent,
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
  getComponent,
}: {
  children: Instance["children"];
  Component: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  getComponent: GetComponent;
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
      getComponent,
    });
    const element = createInstanceElement({
      instance: child,
      Component,
      children,
      getComponent,
    });
    elements.push(element);
  }
  return elements;
};

const createInstanceElement = ({
  Component,
  instance,
  children = [],
  getComponent,
}: {
  instance: Instance;
  Component: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  children?: Array<JSX.Element | string>;
  getComponent: GetComponent;
}) => {
  const props = {
    instance,
    children,
    key: instance.id,
    getComponent,
  };

  return <Component {...props} />;
};
