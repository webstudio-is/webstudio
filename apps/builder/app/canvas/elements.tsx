import {
  Fragment,
  type ForwardRefExoticComponent,
  type JSX,
  type RefAttributes,
  type RefObject,
} from "react";
import type { Instance, Instances } from "@webstudio-is/sdk";
import type { Components } from "@webstudio-is/react-sdk";
import type { InstanceSelector } from "~/shared/tree-utils";

export type WebstudioComponentProps = {
  instance: Instance;
  instanceSelector: Instance["id"][];
  components: Components;
};

export const createInstanceElement = ({
  instances,
  instanceId,
  instanceSelector,
  Component,
  components,
  ref,
}: {
  instances: Instances;
  instanceId: Instance["id"];
  instanceSelector: InstanceSelector;
  Component: ForwardRefExoticComponent<
    WebstudioComponentProps & RefAttributes<HTMLElement>
  >;
  components: Components;
  ref?: RefObject<HTMLElement>;
}) => {
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return null;
  }
  return (
    <Component
      ref={ref}
      key={instance.id}
      instance={instance}
      instanceSelector={instanceSelector}
      components={components}
    />
  );
};

const renderText = (text: string): Array<JSX.Element> => {
  const lines = text.split("\n");
  return lines.map((line, index) => (
    <Fragment key={index}>
      {line}
      {index < lines.length - 1 && <br />}
    </Fragment>
  ));
};

export const createInstanceChildrenElements = ({
  instances,
  instanceSelector,
  children,
  Component,
  components,
}: {
  instances: Instances;
  instanceSelector: InstanceSelector;
  children: Instance["children"][0][];
  Component: ForwardRefExoticComponent<
    WebstudioComponentProps & RefAttributes<HTMLElement>
  >;
  components: Components;
}) => {
  const elements = children.map((child) => {
    if (child.type === "text") {
      return renderText(child.value);
    }
    if (child.type === "expression") {
      return;
    }
    if (child.type === "id") {
      return createInstanceElement({
        instances,
        instanceId: child.value,
        instanceSelector: [child.value, ...instanceSelector],
        Component,
        components,
      });
    }

    child satisfies never;
  });
  // let empty children be coalesced with fallback
  if (elements.length === 0) {
    return;
  }
  return elements;
};
