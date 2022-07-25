import { type MouseEventHandler, useState } from "react";
import { type Instance, type Publish } from "@webstudio-is/react-sdk";
import { Flex } from "~/shared/design-system";
import { PlusIcon } from "~/shared/icons";
import { primitives } from "~/shared/canvas-components";
import { createInstance } from "~/shared/tree-utils";
import { useDrag } from "~/shared/design-system/components/primitives/dnd";
import type { TabName } from "../../types";
import { ComponentThumb } from "./component-thumb";
import { useCanvasRect, useZoom } from "~/designer/shared/nano-states";

const components = (
  Object.keys(primitives) as Array<Instance["component"]>
).filter((component) => primitives[component].isInlineOnly === false);

// type UseDraggableProps = {
//   component: Instance["component"];
//   onDragChange: (isDragging: boolean) => void;
// };

type DraggableThumbProps = {
  onClick: MouseEventHandler<HTMLDivElement>;
  component: Instance["component"];
};

const DraggableThumb = ({
  component,
  // onDragChange,
  onClick,
}: DraggableThumbProps) => {
  return (
    <ComponentThumb
      data-drag-component={component}
      component={component}
      onClick={onClick}
    />
  );
};

type TabContentProps = {
  // onDragChange: UseDraggableProps["onDragChange"];
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

export const TabContent = ({
  // onDragChange,
  publish,
  onSetActiveTab,
}: TabContentProps) => {
  const [_dragItem, setDragItem] = useState<{
    component: Instance["component"];
    originalPointerPosition: { x: number; y: number };
  }>();

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
      const { x, y } = event;

      const component =
        dragComponent != null && components.find((c) => c === dragComponent);

      if (!component) {
        event.cancel();
        return;
      }

      const instance = createInstance({ component });

      setDragItem({
        component,
        originalPointerPosition: { x, y },
      });

      publish<
        "dragStart",
        { origin: "panel" | "canvas"; dragItem: { instance: Instance } }
      >({
        type: "dragStart",
        payload: { origin: "panel", dragItem: { instance } },
      });
    },
    onMove: (poiterCoordinate) => {
      publish<"dragMove", { canvasCoordinates: { x: number; y: number } }>({
        type: "dragMove",
        payload: { canvasCoordinates: toCanvasCoordinates(poiterCoordinate) },
      });
    },
    onEnd() {
      setDragItem(undefined);
      publish<"dragEnd", { origin: "panel" | "canvas" }>({
        type: "dragEnd",
        payload: { origin: "panel" },
      });
    },
  });

  // const handleDragChange = useCallback(
  //   (isDragging: boolean) => {
  //     onDragChange(isDragging);
  //     publish<"dragStartInstance" | "dragEndInstance">({
  //       type: isDragging === true ? "dragStartInstance" : "dragEndInstance",
  //     });
  //   },
  //   [onDragChange, publish]
  // );

  return (
    <Flex gap="1" wrap="wrap" css={{ padding: "$1" }} {...dragProps}>
      {components.map((component: Instance["component"]) => (
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
          // onDragChange={handleDragChange}
        />
      ))}
    </Flex>
  );
};

export const icon = <PlusIcon />;

/*
export const CustomDragLayer = ({ onDrag }: CustomDragLayerProps) => {
  const { component, isDragging, clientOffset, sourceClientOffset } =
    useDragLayer((monitor) => ({
      component: monitor.getItemType() as Instance["component"],
      isDragging: monitor.isDragging(),
      clientOffset: monitor.getClientOffset(),
      sourceClientOffset: monitor.getSourceClientOffset(),
    }));
  const [canvasRect] = useCanvasRect();
  const [zoom] = useZoom();

  useEffect(() => {
    if (
      clientOffset === null ||
      component === null ||
      canvasRect === undefined
    ) {
      return;
    }

    const scale = zoom / 100;
    const currentOffset = {
      x: (clientOffset.x - canvasRect.x) / scale,
      y: (clientOffset.y - canvasRect.y) / scale,
    };

    onDrag({
      currentOffset,
      component,
    });
  }, [clientOffset, component, onDrag, zoom, canvasRect]);

  if (isDragging === false || sourceClientOffset === null) return null;

  return createPortal(
    <div style={layerStyles}>
      <ComponentThumb
        component={component}
        style={{
          transform: `translate3d(${sourceClientOffset.x}px, ${sourceClientOffset.y}px, 0)`,
        }}
        state="dragging"
      />
    </div>,
    document.body
  );
};

*/
