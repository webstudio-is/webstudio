import {
  Fragment,
  useEffect,
  useRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type RefObject,
} from "react";
import type { Instance, Instances } from "@webstudio-is/sdk";
import type { Components } from "@webstudio-is/react-sdk";
import type { InstanceSelector } from "~/shared/tree-utils";
import { $newEditableChildRect } from "~/shared/nano-states";

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

const PositionNotifier = (props: {
  children: (ref: RefObject<HTMLElement>) => JSX.Element | null;
}) => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current == null) {
      return;
    }

    // Remove collapsed from all parents, can occur when you add new node into empty parent
    let parent = ref.current;
    while (parent.parentElement) {
      parent = parent.parentElement;
      parent.removeAttribute("data-ws-collapsed");
    }

    const rect = ref.current.getBoundingClientRect();

    $newEditableChildRect.set(rect);
  }, []);

  return props.children(ref);
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
  children: (
    | Instance["children"][0]
    | { type: "new-editable-content-id"; value: string }
  )[];
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

    if (child.type === "new-editable-content-id") {
      return (
        <PositionNotifier key="new-editable-content-id">
          {(ref) =>
            createInstanceElement({
              instances,
              instanceId: child.value,
              instanceSelector: [child.value, ...instanceSelector],
              Component,
              components,
              ref,
            })
          }
        </PositionNotifier>
      );
    }

    child satisfies never;
  });
  // let empty children be coalesced with fallback
  if (elements.length === 0) {
    return;
  }
  return elements;
};
