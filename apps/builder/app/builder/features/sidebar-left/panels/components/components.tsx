import { useState } from "react";
import { useStore } from "@nanostores/react";
import { createPortal } from "react-dom";
import type { Instance } from "@webstudio-is/project-build";
import {
  type ComponentName,
  getComponentMeta,
  getComponentNames,
  WsComponentMeta,
  componentCategories,
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
import type { TabName } from "../../types";
import { Header, CloseButton } from "../../header";
import { ArrowFocus } from "@webstudio-is/design-system";
import { CollapsibleSection } from "~/builder/shared/inspector";

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

const metasByComponentName: Map<ComponentName, WsComponentMeta> = new Map();
const metasByCategory: Map<
  WsComponentMeta["category"],
  Array<WsComponentMeta>
> = new Map();
const componentNamesByMeta: Map<WsComponentMeta, ComponentName> = new Map();

for (const name of getComponentNames()) {
  const meta = getComponentMeta(name);
  if (meta?.category === undefined) {
    continue;
  }
  let categoryMetas = metasByCategory.get(meta.category);
  if (categoryMetas === undefined) {
    categoryMetas = [];
    metasByCategory.set(meta.category, categoryMetas);
  }
  categoryMetas.push(meta);
  metasByComponentName.set(name, meta);
  componentNamesByMeta.set(meta, name);
}

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
    useDragHandlers.cancelCurrentDrag();
  });

  const handleInsert = (component: ComponentName) => {
    onSetActiveTab("none");
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

  return (
    <Flex css={{ height: "100%", flexDirection: "column" }}>
      <Header
        title="Add"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <div ref={useDragHandlers.rootRef}>
        {Array.from(componentCategories).map((category) => (
          <CollapsibleSection label={category} key={category} fullWidth>
            <ArrowFocus
              render={({ handleKeyDown }) => (
                <Flex
                  onKeyDown={handleKeyDown}
                  gap="2"
                  wrap="wrap"
                  css={{ px: theme.spacing[9], overflow: "auto" }}
                >
                  {(metasByCategory.get(category) ?? []).map(
                    (meta: WsComponentMeta, index) => {
                      const component = componentNamesByMeta.get(meta);
                      if (component === undefined) {
                        return null;
                      }
                      return (
                        <ComponentCard
                          onClick={() => {
                            handleInsert(component);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              handleInsert(component);
                            }
                          }}
                          data-drag-component={component}
                          label={meta.label}
                          icon={<meta.Icon />}
                          key={component}
                          tabIndex={index === 0 ? 0 : -1}
                        />
                      );
                    }
                  )}
                  {dragComponent && (
                    <DragLayer component={dragComponent} point={point} />
                  )}
                </Flex>
              )}
            />
          </CollapsibleSection>
        ))}
      </div>
    </Flex>
  );
};

export const icon = <PlusIcon />;
