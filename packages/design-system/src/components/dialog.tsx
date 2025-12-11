import {
  type ReactNode,
  type ComponentProps,
  type Ref,
  forwardRef,
  useRef,
  type DragEventHandler,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type RefObject,
} from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { css, theme, type CSS } from "../stitches.config";
import { PanelTitle } from "./panel-title";
import { Flex } from "./flex";
import { useDisableCanvasPointerEvents, useResize } from "../utilities";
import type { CSSProperties } from "@stitches/react";
import { mergeRefs } from "@react-aria/utils";
import { Button } from "./button";
import { XIcon, MaximizeIcon, MinimizeIcon } from "@webstudio-is/icons";
import { Separator } from "./separator";
import { Text } from "./text";

const DIALOG_TITLE_HEIGHT = 40;

export const DialogTrigger = Primitive.Trigger;

// An optional accessible description to be announced when the dialog is opened
// https://www.radix-ui.com/docs/primitives/components/dialog#description
export const DialogDescription = Primitive.Description;

const placeholderImage =
  typeof Image !== "undefined" ? new Image(0, 0) : undefined;
// It's important to set the src early, because it has to be loaded by the time drag starts.
if (placeholderImage) {
  placeholderImage.src =
    "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
}

const panelStyle = css({
  boxShadow: theme.shadows.panelSectionDropShadow,
  background: theme.colors.backgroundPanel,
  borderRadius: theme.borderRadius[7],
  display: "flex",
  flexDirection: "column",

  "&:focus": {
    // override browser default
    outline: "none",
  },
});

const DialogContext = createContext<{
  isMaximized: boolean;
  setIsMaximized: (isMaximized: boolean) => void;
  resize?: "both" | "none";
  draggable?: boolean;
}>({
  isMaximized: false,
  setIsMaximized: () => {},
  draggable: true,
  resize: "none",
});

export const Dialog = ({
  resize,
  draggable,
  onOpenChange,
  ...props
}: ComponentProps<typeof Primitive.Dialog> & {
  resize?: "both" | "none";
  draggable?: boolean;
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  return (
    <DialogContext.Provider
      value={{ isMaximized, setIsMaximized, resize, draggable }}
    >
      <Primitive.Dialog
        {...props}
        onOpenChange={(open) => {
          // When dialog closes, there can be state changes in the content that haven't rendered yet.
          // In that case we might close the dialog without saving the form changes.
          // Currently known example is binding popover that opens from variable popover. Second popover gets
          // closed by unmounting if we click outside and first popover doesn't get the changes because it is trying to render
          // the value in a form and serialize the form using FormData.
          // With this we are giving React's render cycle time to render the state before we close the dialog.
          requestAnimationFrame(() => {
            onOpenChange?.(open);
          });
        }}
      />
    </DialogContext.Provider>
  );
};

export const DialogClose = forwardRef(
  (
    { children, ...props }: ComponentProps<typeof Button>,
    ref: Ref<HTMLButtonElement>
  ) => (
    <Primitive.Close asChild>
      {children ?? (
        <Button
          color="ghost"
          prefix={<XIcon />}
          aria-label="Close"
          {...props}
          ref={ref}
        />
      )}
    </Primitive.Close>
  )
);
DialogClose.displayName = "DialogClose";

export const DialogMaximize = forwardRef(
  (props: ComponentProps<typeof Button>, ref: Ref<HTMLButtonElement>) => {
    const { isMaximized, setIsMaximized } = useContext(DialogContext);
    return (
      <Button
        color="ghost"
        prefix={isMaximized ? <MinimizeIcon /> : <MaximizeIcon />}
        aria-label="Expand"
        onClick={() => setIsMaximized(isMaximized ? false : true)}
        {...props}
        ref={ref}
      />
    );
  }
);
DialogMaximize.displayName = "DialogMaximize";

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Rect = Point & Size;

const useBoundary = () => {
  const [boundaryRect, setBoundaryRect] = useState<Rect | undefined>(undefined);

  useEffect(() => {
    const boundaryElement = document.querySelector(
      "[data-dialog-boundary]"
    ) as HTMLElement | null;

    if (!boundaryElement) {
      setBoundaryRect(undefined);
      return;
    }

    const updateBoundary = () => {
      const rect = boundaryElement.getBoundingClientRect();
      setBoundaryRect({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    };

    // Initial measurement
    updateBoundary();

    const resizeObserver = new ResizeObserver(updateBoundary);
    resizeObserver.observe(boundaryElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return useMemo(
    () =>
      boundaryRect ?? {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      },
    [boundaryRect]
  );
};

type UseDraggableProps = {
  isMaximized: boolean;
  minWidth?: number;
  minHeight?: number;
  boundaryTolerance?: { horizontal?: number; vertical?: number };
} & Partial<Rect>;

const applyBoundaries = (
  x: number,
  y: number,
  width: number,
  height: number,
  bounds: Rect,
  tolerance?: { horizontal?: number; vertical?: number }
) => {
  const horizontalTolerance = tolerance?.horizontal ?? 0;
  const verticalTolerance = tolerance?.vertical ?? 0;

  // Constrain width and height to fit within bounds
  const constrainedWidth = Math.min(
    width,
    bounds.width + horizontalTolerance * 2
  );
  const constrainedHeight = Math.min(
    height,
    bounds.height + verticalTolerance * 2
  );

  // Constrain X axis within bounds (with tolerance)
  let constrainedX = Math.max(bounds.x - horizontalTolerance, x);
  constrainedX = Math.min(
    bounds.x + bounds.width + horizontalTolerance - constrainedWidth,
    constrainedX
  );

  // Constrain Y axis within bounds (with tolerance)
  let constrainedY = Math.max(bounds.y - verticalTolerance, y);
  constrainedY = Math.min(
    bounds.y + bounds.height + verticalTolerance - constrainedHeight,
    constrainedY
  );

  return {
    x: constrainedX,
    y: constrainedY,
    width: constrainedWidth,
    height: constrainedHeight,
  };
};

const useDraggable = ({
  width,
  height,
  minHeight,
  minWidth,
  isMaximized,
  boundaryTolerance,
  ...props
}: UseDraggableProps) => {
  const [x, setX] = useState(props.x);
  const [y, setY] = useState(props.y);
  const bounds = useBoundary();

  const lastDragDataRef = useRef<
    | undefined
    | {
        point: Point;
        rect: Rect;
      }
  >(undefined);

  const ref = useRef<HTMLDivElement | null>(null);

  const calcStyle = useCallback(() => {
    const availableWidth = bounds.width;
    const availableHeight = bounds.height;

    const style: CSSProperties = isMaximized
      ? {
          top: bounds.y,
          left: bounds.x,
          width: availableWidth,
          height: availableHeight,
        }
      : !width || !height
        ? {
            top: bounds.y,
            left: bounds.x,
            maxWidth: availableWidth,
            maxHeight: availableHeight,
          }
        : {
            top: Math.max(bounds.y, bounds.y + bounds.height / 2 - height / 2),
            left: Math.max(bounds.x, bounds.x + bounds.width / 2 - width / 2),
            width,
            height,
          };

    if (minWidth !== undefined) {
      style.minWidth = minWidth;
    }
    if (minHeight !== undefined) {
      style.minHeight = minHeight;
    }

    if (isMaximized === false) {
      if (x !== undefined && y !== undefined) {
        // Get actual rendered dimensions if width/height not specified
        const actualWidth = width ?? ref.current?.offsetWidth ?? bounds.width;
        const actualHeight =
          height ?? ref.current?.offsetHeight ?? bounds.height;

        const constrained = applyBoundaries(
          x,
          y,
          actualWidth,
          actualHeight,
          bounds,
          boundaryTolerance
        );

        style.left = constrained.x;
        style.top = constrained.y;
        if (width !== undefined) {
          style.width = constrained.width;
        }
        if (height !== undefined) {
          style.height = constrained.height;
        }
        style.right = "auto";
        style.bottom = "auto";
        style.margin = 0;
      } else if (x !== undefined) {
        const actualWidth = width ?? ref.current?.offsetWidth ?? bounds.width;
        const actualHeight =
          height ?? ref.current?.offsetHeight ?? bounds.height;

        const constrained = applyBoundaries(
          x,
          0,
          actualWidth,
          actualHeight,
          bounds,
          boundaryTolerance
        );

        style.left = constrained.x;
        if (width !== undefined) {
          style.width = constrained.width;
        }
        if (height !== undefined) {
          style.height = constrained.height;
        }
        style.right = "auto";
        style.margin = 0;
      } else if (y !== undefined) {
        const actualWidth = width ?? ref.current?.offsetWidth ?? bounds.width;
        const actualHeight =
          height ?? ref.current?.offsetHeight ?? bounds.height;

        const constrained = applyBoundaries(
          0,
          y,
          actualWidth,
          actualHeight,
          bounds,
          boundaryTolerance
        );

        style.top = constrained.y;
        if (width !== undefined) {
          style.width = constrained.width;
        }
        if (height !== undefined) {
          style.height = constrained.height;
        }
        style.bottom = "auto";
        style.margin = 0;
      } else {
        // Only apply max constraints when not positioned
        style.maxWidth = availableWidth;
        style.maxHeight = availableHeight;
      }
    }

    return style;
  }, [
    x,
    y,
    width,
    height,
    isMaximized,
    minWidth,
    minHeight,
    bounds,
    boundaryTolerance,
  ]);

  const [style, setStyle] = useState(calcStyle());

  useEffect(() => {
    setStyle(calcStyle());
  }, [calcStyle]);

  useEffect(() => {
    if (lastDragDataRef.current) {
      // Until user draggs, we need component props to define the position, because floating panel needs to adjust it after rendering.
      // We don't want to use the props x/y value after user has dragged manually. At this point position is defined
      // by drag interaction and props can't override it, otherwise position will jump for unpredictable reasons, e.g. when parent decides to update.
      return;
    }
    setX(props.x);
    setY(props.y);
  }, [props.x, props.y]);

  const handleDragStart: DragEventHandler = (event) => {
    event.stopPropagation();
    const target = ref.current;
    if (target === null) {
      return;
    }
    if (placeholderImage) {
      event.dataTransfer.setDragImage(placeholderImage, 0, 0);
    }

    const rect = target.getBoundingClientRect();
    target.style.left = `${rect.x}px`;
    target.style.top = `${rect.y}px`;
    lastDragDataRef.current = {
      point: { x: event.pageX, y: event.pageY },
      rect,
    };
  };

  const handleDrag: DragEventHandler = (event) => {
    event.stopPropagation();
    const target = ref.current;

    if (
      event.pageX <= 0 ||
      event.pageY <= 0 ||
      lastDragDataRef.current === undefined ||
      target === null
    ) {
      return;
    }

    const { rect, point } = lastDragDataRef.current;
    const movementX = point.x - event.pageX;
    const movementY = point.y - event.pageY;
    // Allow dragging anywhere without constraints
    const left = rect.x - movementX;
    const top = rect.y - movementY;
    target.style.left = `${left}px`;
    target.style.top = `${top}px`;
  };

  const handleDragEnd: DragEventHandler = (event) => {
    event.stopPropagation();
    const target = ref.current;
    if (target === null) {
      return;
    }
    const rect = target.getBoundingClientRect();

    // Apply constraints to snap to the closest valid position
    let constrainedX = Math.max(rect.x, bounds.x);
    constrainedX = Math.min(constrainedX, bounds.x + bounds.width - rect.width);
    let constrainedY = Math.max(rect.y, bounds.y);
    // Keep at least title visible at the bottom
    constrainedY = Math.min(
      constrainedY,
      bounds.y + bounds.height - DIALOG_TITLE_HEIGHT
    );

    setX(constrainedX);
    setY(constrainedY);

    // Apply the constrained position immediately
    target.style.left = `${constrainedX}px`;
    target.style.top = `${constrainedY}px`;
  };

  return {
    onDragStart: handleDragStart,
    onDrag: handleDrag,
    onDragEnd: handleDragEnd,
    style,
    ref,
  };
};

// This is needed to prevent pointer events on the iframe from interfering with dragging and resizing.
const useSetPointerEvents = (elementRef: RefObject<HTMLElement | null>) => {
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();

  return useCallback(
    (value: string) => {
      return () => {
        value === "none"
          ? disableCanvasPointerEvents()
          : enableCanvasPointerEvents();
        // RAF is needed otherwise dragstart event won't fire because of pointer-events: none
        requestAnimationFrame(() => {
          if (elementRef.current) {
            elementRef.current.style.pointerEvents = value;
          }
        });
      };
    },
    [elementRef, enableCanvasPointerEvents, disableCanvasPointerEvents]
  );
};

const ContentContainer = forwardRef(
  (
    {
      children,
      className,
      css,
      width,
      height,
      x,
      y,
      minWidth,
      minHeight,
      boundaryTolerance,
      ...props
    }: ComponentProps<typeof Primitive.Content> &
      Partial<UseDraggableProps> & {
        css?: CSS;
      },
    forwardedRef: Ref<HTMLDivElement>
  ) => {
    const { resize, isMaximized } = useContext(DialogContext);
    const { ref, ...draggableProps } = useDraggable({
      width,
      height,
      x,
      y,
      minWidth,
      minHeight,
      isMaximized,
      boundaryTolerance,
    });
    const setPointerEvents = useSetPointerEvents(ref);

    const [_, setElement] = useResize({
      onResizeStart: setPointerEvents?.("none"),
      onResizeEnd: setPointerEvents?.("auto"),
    });

    return (
      <Primitive.Content
        className={contentStyle({ className, css, resize })}
        onDragStartCapture={setPointerEvents("none")}
        onDragEndCapture={setPointerEvents("auto")}
        {...draggableProps}
        {...props}
        ref={mergeRefs(forwardedRef, ref, setElement)}
      >
        {children}
      </Primitive.Content>
    );
  }
);
ContentContainer.displayName = "ContentContainer";

export const DialogContent = forwardRef(
  (
    props: ComponentProps<typeof ContentContainer>,
    forwardedRef: Ref<HTMLDivElement>
  ) => {
    return (
      <Primitive.Portal>
        <Primitive.Overlay className={overlayStyle()} />
        <ContentContainer {...props} ref={forwardedRef} />
      </Primitive.Portal>
    );
  }
);
DialogContent.displayName = "DialogContent";

const titleSlotStyle = css({
  // We put title at the bottom in DOM to make the close button last in the TAB order
  // But visually we want it to be first
  order: -1,
});

const titleStyle = css({
  display: "flex",
  flexGrow: 1,
  height: "100%",
  alignItems: "center",
});

export const DialogTitle = ({
  children,
  suffix,
  ...rest
}: ComponentProps<typeof PanelTitle> & {
  suffix?: ReactNode;
  closeLabel?: string;
}) => {
  const { draggable } = useContext(DialogContext);

  return (
    <div className={titleSlotStyle()}>
      <PanelTitle {...rest} suffix={suffix ?? <DialogClose />}>
        <Primitive.Title asChild>
          <Text
            draggable={draggable}
            className={titleStyle()}
            variant="titles"
            truncate
          >
            {children}
          </Text>
        </Primitive.Title>
      </PanelTitle>
      <Separator />
    </div>
  );
};

export const DialogTitleActions = ({ children }: { children: ReactNode }) => {
  return (
    <Flex gap="1" align="center">
      {children}
    </Flex>
  );
};

export const DialogActions = ({ children }: { children: ReactNode }) => {
  return (
    <Flex
      gap="1"
      css={{
        padding: theme.panel.padding,
        // Making sure the tab order is the last item first.
        flexFlow: "row-reverse",
      }}
    >
      {children}
    </Flex>
  );
};

// Styles specific to dialog
// (as opposed to be common for all floating panels)
const overlayStyle = css({
  backgroundColor: "rgba(17, 24, 28, 0.66)",
  position: "fixed",
  inset: 0,
});

const contentStyle = css(panelStyle, {
  position: "fixed",
  width: "min-content",
  height: "min-content",
  minWidth: theme.sizes.sidebarWidth,
  minHeight: theme.spacing[22],
  maxWidth: `calc(100vw - ${theme.spacing[15]})`,
  maxHeight: `calc(100vh - ${theme.spacing[15]})`,
  userSelect: "none",

  overflow: "hidden",
  variants: {
    resize: {
      both: {
        resize: "both",
      },
      none: {
        resize: "none",
      },
    },
  },
});
