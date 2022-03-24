import {
  useEffect,
  useRef,
  MutableRefObject,
  type MouseEventHandler,
  useCallback,
} from "react";
import { useDrag } from "react-dnd";
import { type Instance } from "@webstudio-is/sdk";
import { Flex, Text } from "~/shared/design-system";
import { Component1Icon } from "~/shared/icons";
import { primitives, type DragData } from "~/shared/component";
import { type Publish } from "~/designer/features/canvas-iframe";
import { createInstance } from "~/shared/tree-utils";
import { CustomDragLayer } from "../custom-drag-layer";
import type { TabName } from "../types";

type ComponentProps = {
  Icon: typeof Component1Icon;
  component: Instance["component"];
  onDragChange: (isDragging: boolean) => void;
  onClick: MouseEventHandler<HTMLDivElement>;
  label: string;
};

const Component = ({
  Icon,
  component,
  label,
  onDragChange,
  onClick,
}: ComponentProps) => {
  const lastIsDragging = useRef<boolean | void>();
  const [{ isDragging }, dragRef] = useDrag(
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

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="3"
      css={{
        px: 5,
        width: 75,
        height: 75,
        border: "1px solid $slate6",
        userSelect: "none",
        color: "$hiContrast",
        cursor: "grab",
        "&:hover": {
          background: "$slate3",
        },
      }}
      ref={dragRef}
      onClick={onClick}
    >
      <Icon width={30} height={30} />
      <Text size="1">{label}</Text>
    </Flex>
  );
};

type ComponentsProps = {
  onDragChange: ComponentProps["onDragChange"];
  onSetActiveTab: (tabName: TabName) => void;
  iframeRef: MutableRefObject<HTMLIFrameElement | null>;
  publish: Publish;
};

export const TabContent = ({
  onDragChange,
  publish,
  onSetActiveTab,
}: ComponentsProps) => {
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
        <Component
          key={component}
          Icon={primitives[component].Icon}
          component={component}
          label={primitives[component].label}
          onClick={() => {
            onSetActiveTab("none");
            publish<"insertInstance", Instance>({
              type: "insertInstance",
              payload: createInstance({ component }),
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

export const icon = <Component1Icon />;
