import { type MouseEventHandler, useCallback } from "react";
import { type Instance, type Publish } from "@webstudio-is/react-sdk";
import { Flex } from "~/shared/design-system";
import { PlusIcon } from "~/shared/icons";
import { primitives } from "~/shared/canvas-components";
import { createInstance } from "~/shared/tree-utils";
import type { TabName } from "../../types";
import { ComponentThumb } from "./component-thumb";

type UseDraggableProps = {
  component: Instance["component"];
  onDragChange: (isDragging: boolean) => void;
};

type DraggableThumbProps = {
  onClick: MouseEventHandler<HTMLDivElement>;
} & UseDraggableProps;

const DraggableThumb = ({
  component,
  // onDragChange,
  onClick,
}: DraggableThumbProps) => {
  return <ComponentThumb component={component} onClick={onClick} />;
};

type TabContentProps = {
  onDragChange: UseDraggableProps["onDragChange"];
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

export const TabContent = ({
  onDragChange,
  publish,
  onSetActiveTab,
}: TabContentProps) => {
  const components = (
    Object.keys(primitives) as Array<Instance["component"]>
  ).filter((component) => primitives[component].isInlineOnly === false);

  const handleDragChange = useCallback(
    (isDragging: boolean) => {
      onDragChange(isDragging);
      publish<"dragStartInstance" | "dragEndInstance">({
        type: isDragging === true ? "dragStartInstance" : "dragEndInstance",
      });
    },
    [onDragChange, publish]
  );

  return (
    <Flex gap="1" wrap="wrap" css={{ padding: "$1" }}>
      {components.map((component: Instance["component"]) => (
        <DraggableThumb
          key={component}
          component={component}
          onClick={() => {
            onSetActiveTab("none");
            publish<"insertInstance", { instance: Instance }>({
              type: "insertInstance",
              payload: { instance: createInstance({ component }) },
            });
          }}
          onDragChange={handleDragChange}
        />
      ))}
    </Flex>
  );
};

export const icon = <PlusIcon />;
