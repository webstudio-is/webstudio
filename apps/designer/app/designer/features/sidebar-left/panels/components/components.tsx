import { type MouseEventHandler, useState } from "react";
import { createPortal } from "react-dom";
import {
  type Instance,
  type Publish,
  components,
} from "@webstudio-is/react-sdk";
import { Flex, useDrag } from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { createInstance } from "~/shared/tree-utils";
import type { TabName } from "../../types";
import { ComponentThumb } from "./component-thumb";
import { useCanvasRect, useZoom } from "~/designer/shared/nano-states";

const componentNames = (
  Object.keys(components) as Array<Instance["component"]>
).filter((component) => components[component].isInlineOnly === false);

type DraggableThumbProps = {
  onClick: MouseEventHandler<HTMLDivElement>;
  component: Instance["component"];
};

const DraggableThumb = ({ component, onClick }: DraggableThumbProps) => {
  return (
    <ComponentThumb
      data-drag-component={component}
      component={component}
      onClick={onClick}
    />
  );
};

const DragLayer = ({
  component,
  pointerPosition,
}: {
  component: Instance["component"];
  pointerPosition: { x: number; y: number };
}) => {
  return createPortal(
    <Flex
      css={{
        position: "absolute",
        pointerEvents: "none",
        zIndex: 1,
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <ComponentThumb
        component={component}
        style={{
          transform: `translate3d(${pointerPosition.x}px, ${pointerPosition.y}px, 0)`,
        }}
        state="dragging"
      />
    </Flex>,
    document.body
  );
};

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const [dragComponent, setDragComponent] = useState<Instance["component"]>();
  const [pointerPosition, setPointerPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const [canvasRect] = useCanvasRect();
  const [zoom] = useZoom();

  const toCanvasCoordinates = ({ x, y }: { x: number; y: number }) => {
    if (canvasRect === undefined) {
      return { x: 0, y: 0 };
    }
    const scale = zoom / 100;
    return { x: (x - canvasRect.x) / scale, y: (y - canvasRect.y) / scale };
  };

  const dragProps = useDrag({
    onStart(event) {
      const { dragComponent } = event.target.dataset;

      const component =
        dragComponent != null &&
        componentNames.find((c) => c === dragComponent);

      if (!component) {
        event.cancel();
        return;
      }

      const instance = createInstance({ component });

      setDragComponent(component);

      publish<
        "dragStart",
        { origin: "panel" | "canvas"; dragItem: { instance: Instance } }
      >({
        type: "dragStart",
        payload: { origin: "panel", dragItem: { instance } },
      });
    },
    onMove: (poiterCoordinate) => {
      setPointerPosition(poiterCoordinate);
      publish<"dragMove", { canvasCoordinates: { x: number; y: number } }>({
        type: "dragMove",
        payload: { canvasCoordinates: toCanvasCoordinates(poiterCoordinate) },
      });
    },
    onEnd() {
      setDragComponent(undefined);
      publish<"dragEnd", { origin: "panel" | "canvas" }>({
        type: "dragEnd",
        payload: { origin: "panel" },
      });
    },
  });

  return (
    <Flex gap="1" wrap="wrap" css={{ padding: "$1" }} {...dragProps}>
      {componentNames.map((component: Instance["component"]) => (
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
        />
      ))}
      {dragComponent && (
        <DragLayer
          component={dragComponent}
          pointerPosition={pointerPosition}
        />
      )}
    </Flex>
  );
};

export const icon = <PlusIcon />;
