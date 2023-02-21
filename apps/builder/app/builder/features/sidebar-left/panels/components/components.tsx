import { type MouseEventHandler, useState } from "react";
import { useStore } from "@nanostores/react";
import { createPortal } from "react-dom";
import type { Instance } from "@webstudio-is/project-build";
import {
  type ComponentName,
  getComponentMeta,
  getComponentNames,
} from "@webstudio-is/react-sdk";
import { theme, Flex, useDrag, type Point } from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import { utils } from "@webstudio-is/project";
import { findClosestDroppableTarget } from "~/shared/tree-utils";
import {
  instancesIndexStore,
  selectedInstanceIdStore,
} from "~/shared/nano-states";
import { useSubscribe, type Publish } from "~/shared/pubsub";
import { useCanvasRect } from "~/builder/shared/nano-states";
import { insertInstance } from "~/shared/instance-utils";
import { zoomStore } from "~/shared/nano-states/breakpoints";
import type { TabName } from "../../types";
import { Header, CloseButton } from "../../header";
import { ComponentThumb } from "./component-thumb";

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

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const [dragComponent, setDragComponent] = useState<Instance["component"]>();
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });

  const [canvasRect] = useCanvasRect();
  const zoom = useStore(zoomStore);

  const toCanvasCoordinates = ({ x, y }: Point) => {
    if (canvasRect === undefined) {
      return { x: 0, y: 0 };
    }
    const scale = zoom / 100;
    return { x: (x - canvasRect.x) / scale, y: (y - canvasRect.y) / scale };
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
          dragItem: utils.tree.createInstance({ component: componentName }),
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
        {listedComponentNames.map((component: Instance["component"]) => (
          <DraggableThumb
            key={component}
            component={component}
            onClick={() => {
              onSetActiveTab("none");
              const instance = utils.tree.createInstance({
                component,
              });
              const dropTarget = findClosestDroppableTarget(
                instancesIndexStore.get(),
                selectedInstanceIdStore.get()
              );
              insertInstance(instance, dropTarget);
            }}
          />
        ))}
        {dragComponent && <DragLayer component={dragComponent} point={point} />}
      </Flex>
    </Flex>
  );
};

export const icon = <PlusIcon />;
