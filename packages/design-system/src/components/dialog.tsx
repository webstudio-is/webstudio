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
} from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { css, theme, type CSS } from "../stitches.config";
import { PanelTitle } from "./panel-title";
import { Flex } from "./flex";
import { useDisableCanvasPointerEvents } from "../utilities";
import type { CSSProperties } from "@stitches/react";
import { mergeRefs } from "@react-aria/utils";
import { Button } from "./button";
import { CrossIcon, MaximizeIcon, MinimizeIcon } from "@webstudio-is/icons";
import { Separator } from "./separator";

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
  border: `1px solid ${theme.colors.borderMain}`,
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
}>({
  isMaximized: false,
  setIsMaximized: () => {},
});

export const Dialog = (props: ComponentProps<typeof Primitive.Dialog>) => {
  const [isMaximized, setIsMaximized] = useState(false);
  return (
    <DialogContext.Provider value={{ isMaximized, setIsMaximized }}>
      <Primitive.Dialog {...props} />
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
          prefix={<CrossIcon />}
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

type UseDraggableProps = {
  isMaximized?: boolean;
  minWidth?: number;
  minHeight?: number;
} & Partial<Rect>;

const useDraggable = ({
  x,
  y,
  width,
  height,
  minHeight,
  minWidth,
}: UseDraggableProps) => {
  const { isMaximized } = useContext(DialogContext);
  const initialDataRef = useRef<
    | undefined
    | {
        point: Point;
        rect: Rect;
      }
  >(undefined);
  const { enableCanvasPointerEvents, disableCanvasPointerEvents } =
    useDisableCanvasPointerEvents();
  const draggableRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart: DragEventHandler = (event) => {
    const target = draggableRef.current;
    if (target === null) {
      return;
    }
    disableCanvasPointerEvents();
    if (placeholderImage) {
      event.dataTransfer.setDragImage(placeholderImage, 0, 0);
    }

    const rect = target.getBoundingClientRect();
    target.style.left = `${rect.x}px`;
    target.style.top = `${rect.y}px`;
    target.style.transform = "none";
    initialDataRef.current = {
      point: { x: event.pageX, y: event.pageY },
      rect,
    };
  };

  const handleDrag: DragEventHandler = (event) => {
    const target = draggableRef.current;

    if (
      event.pageX <= 0 ||
      event.pageY <= 0 ||
      initialDataRef.current === undefined ||
      target === null
    ) {
      return;
    }
    const { rect, point } = initialDataRef.current;
    const movementX = point.x - event.pageX;
    const movementY = point.y - event.pageY;
    let left = Math.max(rect.x - movementX, 0);
    left = Math.min(left, window.innerWidth - rect.width);
    let top = Math.max(rect.y - movementY, 0);
    // We want some part of the dialog to be visible but otherwise let it go off screen.
    top = Math.min(top, window.innerHeight - 40);
    target.style.left = `${left}px`;
    target.style.top = `${top}px`;
  };

  const style: CSSProperties = isMaximized
    ? {
        ...centeredContent,
        width: "100vw",
        height: "100vh",
      }
    : {
        ...centeredContent,
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
    if (x !== undefined) {
      style.left = x;
      delete style.transform;
    }
    if (y !== undefined) {
      style.top = y;
      delete style.transform;
    }
  }
  return {
    onDragStart: handleDragStart,
    onDrag: handleDrag,
    onDragEnd: enableCanvasPointerEvents,
    style,
    draggableRef,
  };
};

export const DialogContent = forwardRef(
  (
    {
      children,
      className,
      css,
      resize = "none",
      width,
      height,
      x,
      y,
      minWidth,
      minHeight,
      ...props
    }: ComponentProps<typeof Primitive.Content> &
      UseDraggableProps & {
        css?: CSS;
        resize?: "auto" | "none";
      },
    forwardedRef: Ref<HTMLDivElement>
  ) => {
    const { draggableRef, ...draggableProps } = useDraggable({
      width,
      height,
      x,
      y,
      minWidth,
      minHeight,
    });

    return (
      <Primitive.Portal>
        <Primitive.Overlay className={overlayStyle()} />
        <Primitive.Content
          className={contentStyle({ className, css, resize })}
          {...draggableProps}
          {...props}
          ref={mergeRefs(forwardedRef, draggableRef)}
        >
          {children}
        </Primitive.Content>
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

export const DialogTitle = ({
  children,
  suffix,
  ...rest
}: ComponentProps<typeof PanelTitle> & {
  suffix?: ReactNode;
  closeLabel?: string;
}) => (
  <div className={titleSlotStyle()}>
    <PanelTitle {...rest} suffix={suffix ?? <DialogClose />}>
      <Primitive.Title className={titleStyle()}>{children}</Primitive.Title>
    </PanelTitle>
    <Separator />
  </div>
);

export const DialogTitleActions = ({ children }: { children: ReactNode }) => {
  return (
    <Flex
      gap="1"
      onMouseDown={(event) => {
        // Prevent dragging dialog
        event.preventDefault();
      }}
    >
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

const centeredContent: CSSProperties = {
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
};

const contentStyle = css(panelStyle, {
  position: "fixed",
  width: "min-content",
  minWidth: theme.sizes.sidebarWidth,
  minHeight: theme.spacing[22],
  maxWidth: `calc(100vw - ${theme.spacing[15]})`,
  maxHeight: `calc(100vh - ${theme.spacing[15]})`,
  userSelect: "none",

  overflow: "hidden",
  variants: {
    resize: {
      auto: {
        resize: "auto",
      },
      none: {
        resize: "none",
      },
    },
  },
});

const titleStyle = css({
  // Resetting H2 styles (Primitive.Title is H2)
  all: "unset",
});
