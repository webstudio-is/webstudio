import { type MouseEventHandler, useState } from "react";
import { createPortal } from "react-dom";
import { type Instance, components } from "@webstudio-is/react-sdk";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import { Flex } from "@webstudio-is/design-system";
import { useDrag, type Point } from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { createInstance } from "~/shared/tree-utils";
import type { TabName } from "../../types";
import { ComponentThumb } from "./component-thumb";
import { useCanvasRect, useZoom } from "~/designer/shared/nano-states";
import { Header } from "../../lib/header";

const componentNames = (
  Object.keys(components) as Array<Instance["component"]>
).filter((component) => components[component].isListed);

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
  point,
}: {
  component: Instance["component"];
  point: Point;
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
          transform: `translate3d(${point.x}px, ${point.y}px, 0)`,
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

const elementToComponentName = (element: Element) => {
  // If drag doesn't start on the button element directly but on one of its children,
  // we need to trace back to the button that has the data.
  const parentWithData = element.closest("[data-drag-component]");

  if (!(parentWithData instanceof HTMLElement)) {
    return;
  }
  const { dragComponent } = parentWithData.dataset;
  return componentNames.find((component) => component === dragComponent);
};

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const [dragComponent, setDragComponent] = useState<Instance["component"]>();
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });

  const [canvasRect] = useCanvasRect();
  const [zoom] = useZoom();

  const toCanvasCoordinates = ({ x, y }: Point) => {
    if (canvasRect === undefined) {
      return { x: 0, y: 0 };
    }
    const scale = zoom / 100;
    return { x: (x - canvasRect.x) / scale, y: (y - canvasRect.y) / scale };
  };

  const useDragHandlers = useDrag<Instance["component"]>({
    elementToData(element) {
      const componentName = elementToComponentName(element);
      if (componentName === undefined) {
        return false;
      }
      return componentName;
    },
    onStart({ data: componentName }) {
      setDragComponent(componentName);
      publish({
        type: "dragStart",
        payload: {
          origin: "panel",
          dragItem: createInstance({ component: componentName }),
        },
      });
    },
    onMove: (point) => {
      setPoint(point);
      publish({
        type: "dragMove",
        payload: { canvasCoordinates: toCanvasCoordinates(point) },
      });
    },
    onEnd({ isCanceled }) {
      setDragComponent(undefined);
      publish({
        type: "dragEnd",
        payload: { origin: "panel", isCanceled },
      });
    },
  });

  useSubscribe("cancelCurrentDrag", () => {
    useDragHandlers.cancelCurrentDrag();
  });

  return (
    <>
      <Header
        title="Add"
        onClose={() => {
          onSetActiveTab("none");
        }}
      />
      <Flex
        gap="1"
        wrap="wrap"
        css={{ padding: "$1" }}
        ref={useDragHandlers.rootRef}
      >
        {componentNames.map((component: Instance["component"]) => (
          <DraggableThumb
            key={component}
            component={component}
            onClick={() => {
              onSetActiveTab("none");
              publish({
                type: "insertInstance",
                payload: { instance: createInstance({ component }) },
              });
            }}
          />
        ))}
        {dragComponent && <DragLayer component={dragComponent} point={point} />}
      </Flex>
    </>
  );
};

export const icon = <PlusIcon />;
