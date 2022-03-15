import {
  useEffect,
  useRef,
  MutableRefObject,
  type MouseEventHandler,
} from "react";
import { useDrag } from "react-dnd";
import { type Instance } from "@webstudio-is/sdk";
import { Flex, Text } from "~/shared/design-system";
import { Component1Icon } from "~/shared/icons";
import { primitives, type InitialDragData } from "~/shared/component";
import { type Publish } from "~/designer/iframe";
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
            publish<"insertComponent", { component: Instance["component"] }>({
              type: "insertComponent",
              payload: { component },
            });
          }}
          onDragChange={(isDragging: boolean) => {
            onDragChange(isDragging);
            publish<"dragStartComponent" | "dragEndComponent">({
              type:
                isDragging === true ? "dragStartComponent" : "dragEndComponent",
            });
          }}
        />
      ))}
      <CustomDragLayer
        onDrag={(dragData: InitialDragData) => {
          publish<"dragComponent", InitialDragData>({
            type: "dragComponent",
            payload: {
              ...dragData,
              currentOffset: dragData.currentOffset,
            },
          });
        }}
      />
    </Flex>
  );
};

export const icon = <Component1Icon />;
