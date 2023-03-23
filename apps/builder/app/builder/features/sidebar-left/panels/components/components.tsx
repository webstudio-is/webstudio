import { useState } from "react";
import { useStore } from "@nanostores/react";
import { createPortal } from "react-dom";
import type { Instance } from "@webstudio-is/project-build";
import {
  type ComponentName,
  getComponentMeta,
  getComponentNames,
} from "@webstudio-is/react-sdk";
import {
  theme,
  Flex,
  useDrag,
  type Point,
  ComponentCard,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { findClosestDroppableTarget } from "~/shared/tree-utils";
import {
  instancesIndexStore,
  selectedInstanceSelectorStore,
} from "~/shared/nano-states";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import {
  isCanvasPointerEventsEnabledStore,
  useCanvasRect,
} from "~/builder/shared/nano-states";
import { insertNewComponentInstance } from "~/shared/instance-utils";
import { zoomStore } from "~/shared/nano-states/breakpoints";
import type { TabName } from "../../types";
import { Header, CloseButton } from "../../header";

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

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

const elementToComponentName = (
  element: Element,
  listedComponentNames: ComponentName[]
) => {
  // If drag doesn't start on the button element directly but on one of its children,
  // we need to trace back to the button that has the data.
  const parentWithData = element.closest("[data-drag-component]");

  if (!(parentWithData instanceof HTMLElement)) {
    return;
  }
  const { dragComponent } = parentWithData.dataset;
  return listedComponentNames.find((component) => component === dragComponent);
};

const listedComponentNames = getComponentNames().filter((name) => {
  const meta = getComponentMeta(name);
  return (
    meta?.type === "container" ||
    meta?.type === "control" ||
    meta?.type === "embed" ||
    meta?.type === "rich-text"
  );
});

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

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const [dragComponent, setDragComponent] = useState<Instance["component"]>();
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const [canvasRect] = useCanvasRect();
  const zoom = useStore(zoomStore);

  const useDragHandlers = useDrag<Instance["component"]>({
    elementToData(element) {
      const componentName = elementToComponentName(
        element,
        listedComponentNames
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
    useDragHandlers.cancelCurrentDrag();
  });

  return (
    <Flex css={{ height: "100%", flexDirection: "column" }}>
      <Header
        title="Add"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <Flex
        gap="1"
        wrap="wrap"
        css={{ padding: theme.spacing[3], overflow: "auto" }}
        ref={useDragHandlers.rootRef}
      >
        {listedComponentNames.map((component: Instance["component"]) => {
          const meta = getComponentMeta(component);
          if (meta === undefined) {
            return null;
          }
          return (
            <ComponentCard
              onClick={() => {
                onSetActiveTab("none");
                const dropTarget = findClosestDroppableTarget(
                  instancesIndexStore.get(),
                  // @todo accept instance Selector
                  selectedInstanceSelectorStore.get()?.[0]
                );
                insertNewComponentInstance(component, dropTarget);
              }}
              data-drag-component={component}
              label={meta.label}
              icon={<meta.Icon />}
              key={component}
            />
          );
        })}
        {dragComponent && <DragLayer component={dragComponent} point={point} />}
      </Flex>
    </Flex>
  );
};

export const icon = <PlusIcon />;
