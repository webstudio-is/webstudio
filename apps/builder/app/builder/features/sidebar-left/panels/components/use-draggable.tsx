import { useState } from "react";
import { useStore } from "@nanostores/react";
import { createPortal } from "react-dom";
import type { Instance } from "@webstudio-is/project-build";
import {
  type ComponentName,
  type WsComponentMeta,
  getComponentMeta,
} from "@webstudio-is/react-sdk";
import {
  type Point,
  Flex,
  useDrag,
  ComponentCard,
} from "@webstudio-is/design-system";
import { findClosestDroppableTarget } from "~/shared/tree-utils";
import {
  instancesStore,
  selectedInstanceSelectorStore,
  selectedPageStore,
} from "~/shared/nano-states";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import {
  isCanvasPointerEventsEnabledStore,
  useCanvasRect,
} from "~/builder/shared/nano-states";
import { insertNewComponentInstance } from "~/shared/instance-utils";
import { zoomStore } from "~/shared/nano-states/breakpoints";

const DragLayer = ({
  component,
  point,
}: {
  component: Instance["component"];
  point: Point;
}) => {
  const meta = getComponentMeta(component);
  if (meta === undefined) {
    return null;
  }

  return createPortal(
    <Flex
      // Container is used to position card
      css={{
        position: "absolute",
        inset: 0,
      }}
    >
      <ComponentCard
        label={meta.label}
        icon={<meta.Icon />}
        style={{
          transform: `translate3d(${point.x}px, ${point.y}px, 0)`,
        }}
      />
    </Flex>,
    document.body
  );
};

const toCanvasCoordinates = (
  { x, y }: Point,
  zoom: number,
  canvasRect?: DOMRect
) => {
  if (canvasRect === undefined) {
    return { x: 0, y: 0 };
  }
  const scale = zoom / 100;
  return { x: (x - canvasRect.x) / scale, y: (y - canvasRect.y) / scale };
};

const elementToComponentName = (
  element: Element,
  metasByComponentName: Map<ComponentName, WsComponentMeta>
) => {
  // If drag doesn't start on the button element directly but on one of its children,
  // we need to trace back to the button that has the data.
  const parentWithData = element.closest("[data-drag-component]");

  if (!(parentWithData instanceof HTMLElement)) {
    return;
  }
  const { dragComponent } = parentWithData.dataset;
  return metasByComponentName.has(dragComponent as ComponentName)
    ? dragComponent
    : undefined;
};

export const useDraggable = ({
  publish,
  metasByComponentName,
}: {
  publish: Publish;
  metasByComponentName: Map<ComponentName, WsComponentMeta>;
}) => {
  const [dragComponent, setDragComponent] = useState<Instance["component"]>();
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const [canvasRect] = useCanvasRect();
  const zoom = useStore(zoomStore);

  const dragHandlers = useDrag<Instance["component"]>({
    elementToData(element) {
      const componentName = elementToComponentName(
        element,
        metasByComponentName
      );
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
          type: "insert",
          dragComponent: componentName,
        },
      });
      isCanvasPointerEventsEnabledStore.set(false);
    },
    onMove: (point) => {
      setPoint(point);
      publish({
        type: "dragMove",
        payload: {
          canvasCoordinates: toCanvasCoordinates(point, zoom, canvasRect),
        },
      });
    },
    onEnd({ isCanceled }) {
      setDragComponent(undefined);
      publish({
        type: "dragEnd",
        payload: { isCanceled },
      });
      isCanvasPointerEventsEnabledStore.set(true);
    },
  });

  useSubscribe("cancelCurrentDrag", () => {
    dragHandlers.cancelCurrentDrag();
  });

  const dragCard = dragComponent ? (
    <DragLayer component={dragComponent} point={point} />
  ) : undefined;

  const handleInsert = (component: ComponentName) => {
    const selectedPage = selectedPageStore.get();
    if (selectedPage === undefined) {
      return;
    }
    const dropTarget = findClosestDroppableTarget(
      instancesStore.get(),
      // fallback to root as drop target
      selectedInstanceSelectorStore.get() ?? [selectedPage.rootInstanceId]
    );
    insertNewComponentInstance(component, dropTarget);
  };

  return {
    dragCard,
    draggableContainerRef: dragHandlers.rootRef,
    handleInsert,
  };
};
