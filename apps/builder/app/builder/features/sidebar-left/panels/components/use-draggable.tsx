import { useState } from "react";
import { useStore } from "@nanostores/react";
import { createPortal } from "react-dom";
import type { Instance } from "@webstudio-is/project-build";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";
import {
  type Point,
  Flex,
  useDrag,
  ComponentCard,
} from "@webstudio-is/design-system";
import { findClosestDroppableTarget } from "~/shared/tree-utils";
import {
  instancesStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  selectedPageStore,
} from "~/shared/nano-states";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import {
  canvasRectStore,
  isCanvasPointerEventsEnabledStore,
  scaleStore,
} from "~/builder/shared/nano-states";
import { insertNewComponentInstance } from "~/shared/instance-utils";
import { MetaIcon } from "~/builder/shared/meta-icon";

const DragLayer = ({
  component,
  point,
}: {
  component: Instance["component"];
  point: Point;
}) => {
  const metas = useStore(registeredComponentMetasStore);
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
        label={meta.label}
        icon={<MetaIcon size="auto" icon={meta.icon} />}
        style={{
          transform: `translate3d(${point.x}px, ${point.y}px, 0)`,
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

export const elementToComponentName = (
  element: Element,
  metaByComponentName: Map<string, WsComponentMeta>
) => {
  // If drag doesn't start on the button element directly but on one of its children,
  // we need to trace back to the button that has the data.
  const parentWithData = element.closest(`[${dragItemAttribute}]`);

  if (parentWithData instanceof HTMLElement) {
    const dragComponent = parentWithData.dataset.dragComponent as string;
    if (metaByComponentName.has(dragComponent)) {
      return dragComponent;
    }
  }
  return false;
};

export const useDraggable = ({
  publish,
  metaByComponentName,
}: {
  publish: Publish;
  metaByComponentName: Map<string, WsComponentMeta>;
}) => {
  const [dragComponent, setDragComponent] = useState<Instance["component"]>();
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const canvasRect = useStore(canvasRectStore);
  const scale = useStore(scaleStore);

  const dragHandlers = useDrag<Instance["component"]>({
    elementToData(element) {
      return elementToComponentName(element, metaByComponentName);
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
      isCanvasPointerEventsEnabledStore.set(true);
    },
  });

  useSubscribe("cancelCurrentDrag", () => {
    dragHandlers.cancelCurrentDrag();
  });

  const dragCard = dragComponent ? (
    <DragLayer component={dragComponent} point={point} />
  ) : undefined;

  const handleInsert = (component: string) => {
    const selectedPage = selectedPageStore.get();
    if (selectedPage === undefined) {
      return;
    }
    const dropTarget = findClosestDroppableTarget(
      instancesStore.get(),
      // fallback to root as drop target
      selectedInstanceSelectorStore.get() ?? [selectedPage.rootInstanceId],
      [component]
    );
    if (dropTarget) {
      insertNewComponentInstance(component, dropTarget);
    }
  };

  return {
    dragCard,
    draggableContainerRef: dragHandlers.rootRef,
    handleInsert,
  };
};
