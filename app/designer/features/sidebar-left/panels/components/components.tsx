import { useEffect, useRef, type MouseEventHandler, useCallback } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { type Instance, type Publish } from "@webstudio-is/sdk";
import { Flex } from "~/shared/design-system";
import { PlusIcon } from "~/shared/icons";
import { primitives, type DragData } from "~/shared/canvas-components";
import { createInstance } from "~/shared/tree-utils";
import type { TabName } from "../../types";
import { CustomDragLayer } from "./custom-drag-layer";
import { ComponentThumb } from "./component-thumb";

type UseDraggableProps = {
  component: Instance["component"];
  onDragChange: (isDragging: boolean) => void;
};

const useDraggable = ({ component, onDragChange }: UseDraggableProps) => {
  const lastIsDragging = useRef<boolean | void>();
  const [{ isDragging }, dragRef, preview] = useDrag(
    () => ({
      type: component,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    []
  );

  useEffect(() => {
    if (lastIsDragging.current !== undefined) onDragChange(isDragging);
    lastIsDragging.current = isDragging;
  }, [isDragging, onDragChange]);

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return dragRef;
};

type DraggableThumbProps = {
  onClick: MouseEventHandler<HTMLDivElement>;
} & UseDraggableProps;

const DraggableThumb = ({
  component,
  onDragChange,
  onClick,
}: DraggableThumbProps) => {
  const dragRef = useDraggable({ component, onDragChange });
  return (
    <ComponentThumb component={component} ref={dragRef} onClick={onClick} />
  );
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
      <CustomDragLayer
        onDrag={(dragData) => {
          publish<"dragInstance", DragData>({
            type: "dragInstance",
            payload: {
              instance: createInstance({ component: dragData.component }),
              currentOffset: dragData.currentOffset,
            },
          });
        }}
      />
    </Flex>
  );
};

export const icon = <PlusIcon />;
