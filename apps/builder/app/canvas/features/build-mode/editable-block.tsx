import { useStore } from "@nanostores/react";
import type {
  AnyComponent,
  WebstudioComponentSystemProps,
} from "@webstudio-is/react-sdk";
import type { Instance } from "@webstudio-is/sdk";
import * as React from "react";
import { shallowEqual } from "shallow-equal";
import {
  $newEditableChildAnchor,
  $newEditableChildRect,
} from "~/shared/nano-states";
import type { InstanceSelector } from "~/shared/tree-utils";

const MenuPositionInitializer = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current == null) {
      return;
    }
    const rect = ref.current.getBoundingClientRect();

    $newEditableChildRect.set(rect);
  }, []);

  return (
    <div
      style={{
        minWidth: "50px",
        backgroundColor: "orange",
        padding: "4px",
      }}
    >
      <div
        ref={ref}
        style={{
          backgroundColor: "yellow",
        }}
      >
        New component placeholder
      </div>
    </div>
  );
};

export const EditableBlock = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode } & WebstudioComponentSystemProps
>(({ children, ...props }, ref) => {
  const newEditableChildAnchor = useStore($newEditableChildAnchor);

  const elementsChildArray = React.Children.toArray(children).filter((child) =>
    React.isValidElement(child)
  );

  if (elementsChildArray.length === 0) {
    return <div>Impossible Editable Block child array length</div>;
  }

  const childArray = [elementsChildArray[0]];
  const { instanceSelector } = elementsChildArray[0].props as {
    instance: Instance;
    instanceSelector: InstanceSelector;
  };
  const parentSelector = instanceSelector.slice(1);

  if (shallowEqual(newEditableChildAnchor, parentSelector)) {
    childArray.push(<MenuPositionInitializer key="menu-placeholder" />);
  }

  for (let i = 1; i < elementsChildArray.length; i++) {
    const element = elementsChildArray[i];
    childArray.push(element);
    const elementProps = element.props as {
      instance: Instance;
      instanceSelector: InstanceSelector;
    };

    if (shallowEqual(elementProps.instanceSelector, newEditableChildAnchor)) {
      childArray.push(<MenuPositionInitializer key="menu-placeholder" />);
    }
  }

  const editableBlockStyle =
    childArray.length === 1 ? {} : { display: "contents" };

  return (
    <div ref={ref} style={editableBlockStyle} {...props}>
      {childArray}
    </div>
  );
}) as AnyComponent;
