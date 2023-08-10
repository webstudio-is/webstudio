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
  toast,
  useDisableCanvasPointerEvents,
} from "@webstudio-is/design-system";
import {
  instancesStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  selectedPageStore,
} from "~/shared/nano-states";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import { canvasRectStore, scaleStore } from "~/builder/shared/nano-states";
import {
  computeInstancesConstraints,
  findClosestDroppableTarget,
  getComponentTemplateData,
  insertTemplateData,
} from "~/shared/instance-utils";
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

const formatInsertionError = (component: string, meta: WsComponentMeta) => {
  const or = new Intl.ListFormat("en", {
    type: "disjunction",
  });
  const and = new Intl.ListFormat("en", {
    type: "conjunction",
  });
  const messages: string[] = [];
  if (meta.requiredAncestors) {
    const listString = or.format(meta.requiredAncestors);
    messages.push(`can be added only inside of ${listString}`);
  }
  if (meta.invalidAncestors) {
    const listString = and.format(meta.invalidAncestors);
    messages.push(`cannot be added inside of ${listString}`);
  }
  return `${component} ${and.format(messages)}`;
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
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

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

  const handleInsert = (component: string) => {
    const selectedPage = selectedPageStore.get();
    if (selectedPage === undefined) {
      return;
    }
    const templateData = getComponentTemplateData(component);
    if (templateData === undefined) {
      return;
    }
    const newInstances = new Map(
      templateData.instances.map((instance) => [instance.id, instance])
    );
    const rootInstanceIds = templateData.children
      .filter((child) => child.type === "id")
      .map((child) => child.value);
    const instanceSelector = selectedInstanceSelectorStore.get() ?? [
      selectedPage.rootInstanceId,
    ];
    const metas = registeredComponentMetasStore.get();
    const dropTarget = findClosestDroppableTarget(
      metas,
      instancesStore.get(),
      // fallback to root as drop target
      instanceSelector,
      computeInstancesConstraints(metas, newInstances, rootInstanceIds)
    );
    if (dropTarget === undefined) {
      const meta = metas.get(component);
      if (meta) {
        toast.error(formatInsertionError(component, meta));
      }
      return;
    }
    insertTemplateData(templateData, dropTarget);
  };

  return {
    dragCard,
    draggableContainerRef: dragHandlers.rootRef,
    handleInsert,
  };
};
