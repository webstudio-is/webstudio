import { useState } from "react";
import { useStore } from "@nanostores/react";
import { createPortal } from "react-dom";
import type { Instance } from "@webstudio-is/sdk";
import {
  type Point,
  Flex,
  useDrag,
  ComponentCard,
  useDisableCanvasPointerEvents,
  rawTheme,
} from "@webstudio-is/design-system";
import { $registeredComponentMetas } from "~/shared/nano-states";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import { $canvasRect, $scale } from "~/builder/shared/nano-states";
import { getInstanceLabel } from "~/shared/instance-utils";
import { MetaIcon } from "~/builder/shared/meta-icon";

const DragLayer = ({
  component,
  point,
}: {
  component: Instance["component"];
  point: Point;
}) => {
  const metas = useStore($registeredComponentMetas);
  const meta = metas.get(component);
  if (meta === undefined) {
    return null;
  }

  return createPortal(
    <Flex
      // Container is used to position card
      css={{
        position: "absolute",
        // Prevents flickering between hover/outside mouse position
        pointerEvents: "none",
        inset: 0,
      }}
    >
      <ComponentCard
        label={getInstanceLabel({ component }, meta)}
        icon={<MetaIcon size="auto" icon={meta.icon} />}
        style={{
          transform: `translate3d(${point.x}px, ${point.y}px, 0)`,
          width: rawTheme.spacing[20],
          height: rawTheme.spacing[20],
        }}
      />
    </Flex>,
    document.body
  );
};

export const dragItemAttribute = "data-drag-component";

const toCanvasCoordinates = (
  { x, y }: Point,
  scale: number,
  canvasRect?: DOMRect
) => {
  if (canvasRect === undefined) {
    return { x: 0, y: 0 };
  }
  const scaleFraction = scale / 100;
  return {
    x: (x - canvasRect.x) / scaleFraction,
    y: (y - canvasRect.y) / scaleFraction,
  };
};

const elementToComponentName = (
  element: Element,
  availableComponents: Set<string>
) => {
  // If drag doesn't start on the button element directly but on one of its children,
  // we need to trace back to the button that has the data.
  const parentWithData = element.closest(`[${dragItemAttribute}]`);

  if (parentWithData instanceof HTMLElement) {
    const dragComponent = parentWithData.dataset.dragComponent as string;
    if (availableComponents.has(dragComponent)) {
      return dragComponent;
    }
  }
  return false;
};

export const useDraggable = ({
  publish,
  availableComponents,
}: {
  publish: Publish;
  availableComponents: Set<string>;
}) => {
  const [dragComponent, setDragComponent] = useState<Instance["component"]>();
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const canvasRect = useStore($canvasRect);
  const scale = useStore($scale);
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  const dragHandlers = useDrag<Instance["component"]>({
    elementToData(element) {
      return elementToComponentName(element, availableComponents);
    },
    onStart({ data: componentName }) {
      setDragComponent(componentName);
      publish({
        type: "dragStart",
        payload: {
          origin: "panel",
          type: "insert",
          dragComponent: componentName,
        },
      });
      disableCanvasPointerEvents();
    },
    onMove: (point) => {
      setPoint(point);
      publish({
        type: "dragMove",
        payload: {
          canvasCoordinates: toCanvasCoordinates(point, scale, canvasRect),
        },
      });
    },
    onEnd({ isCanceled }) {
      setDragComponent(undefined);
      publish({
        type: "dragEnd",
        payload: { isCanceled },
      });

      enableCanvasPointerEvents();
    },
  });

  useSubscribe("cancelCurrentDrag", () => {
    dragHandlers.cancelCurrentDrag();
  });

  const dragCard = dragComponent ? (
    <DragLayer component={dragComponent} point={point} />
  ) : undefined;

  return {
    dragCard,
    draggableContainerRef: dragHandlers.rootRef,
  };
};
