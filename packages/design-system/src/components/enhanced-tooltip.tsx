import {
  type Ref,
  type ComponentProps,
  type FocusEvent,
  forwardRef,
  useRef,
  useState,
  createContext,
  useContext,
  useMemo,
} from "react";
import { Tooltip, type TooltipProps } from "./tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useDebouncedCallback } from "use-debounce";

const EnhancedTooltipContext = createContext<
  Omit<ComponentProps<typeof TooltipPrimitive.TooltipProvider>, "children">
>({});

const DEFAULT_DELAY_DURATION = 1600;

/**
 * To have the ability to access properties from TooltipPrimitive.TooltipProvider at EnhancedTooltip
 **/
export const EnhancedTooltipProvider = ({
  delayDuration = DEFAULT_DELAY_DURATION,
  skipDelayDuration = 0,
  disableHoverableContent = false,
  children,
}: ComponentProps<typeof TooltipPrimitive.TooltipProvider>) => {
  const contextValue = useMemo(
    () => ({
      delayDuration,
      skipDelayDuration,
      disableHoverableContent,
    }),
    [delayDuration, disableHoverableContent, skipDelayDuration]
  );

  return (
    <EnhancedTooltipContext.Provider value={contextValue}>
      <TooltipPrimitive.TooltipProvider {...contextValue}>
        {children}
      </TooltipPrimitive.TooltipProvider>
    </EnhancedTooltipContext.Provider>
  );
};

export const useEnhancedTooltipProps = () => useContext(EnhancedTooltipContext);

/**
 * EnhancedTooltip has the following differences from the radix-ui
 * 1. Don't show the tooltip if any click or key-down was made inside Tooltip.Trigger
 * 2. Show Tooltip on focus after the delay
 **/
export const EnhancedTooltip = forwardRef(
  (
    props: Omit<TooltipProps, "open" | "onOpenChange">,
    ref: Ref<HTMLDivElement>
  ) => {
    const [open, setOpen] = useState(props.defaultOpen ?? false);
    const context = useContext(EnhancedTooltipContext);

    /**
     * Used to skip multiple focus/blur calls
     */
    const isFocusedRef = useRef(false);

    /**
     * Disable opening if any interaction with control occurred
     */
    const allowOpenRef = useRef(true);

    const handleDisableOpen = () => {
      allowOpenRef.current = false;
      setOpen(false);
      showTooltipDelayed.cancel();
    };

    const showTooltipDelayed = useDebouncedCallback(
      () => {
        if (allowOpenRef.current) {
          setOpen(true);
        }
      },
      props.delayDuration ?? context.delayDuration ?? DEFAULT_DELAY_DURATION,
      { leading: false }
    );

    // We debounce blur/focus events in a single function, to skip fast `blur/focus` which can occur during select menu hovers
    const handleFocusEventsDebounced = useDebouncedCallback(
      (eventType: "focus" | "blur" | "mouseLeave") => {
        if (eventType === "blur") {
          isFocusedRef.current = false;
          allowOpenRef.current = true;
          setOpen(false);
          showTooltipDelayed.cancel();
          return;
        }

        if (eventType === "mouseLeave") {
          allowOpenRef.current = true;
          isFocusedRef.current = true;
          return;
        }

        if (isFocusedRef.current === false) {
          showTooltipDelayed();
        }

        isFocusedRef.current = true;
      },
      0,
      { leading: false }
    );

    const triggerProps = {
      onFocus: (event: FocusEvent<HTMLElement>) => {
        handleFocusEventsDebounced("focus");
        event.preventDefault();
      },
      onBlur: (event: FocusEvent<HTMLElement>) => {
        handleFocusEventsDebounced("blur");
        event.preventDefault();
      },
      onPointerDown: () => {
        handleDisableOpen();
      },
      onKeyDown: () => {
        handleDisableOpen();
      },
      /*
        When onKeyDown or onPointerDown events occur, the tooltips are disabled.
        Inorder not to show them when the drag operation is under progress.
        However, there is a scenario in which users press keyDown,
        drag the mouse, and leaves the icon and then leaves the drag on the input. (e.g., columnGap and rowGap handlers).
        In this case, it is necessary to reset and enable the tooltips to appear again when
        users hover over the icon after completing the drag operation. Without this reset,
        the tooltips may not appear if the icon is revisited following a keyDown and drag operation.
        Because showTooltipDelayed.cancel() is called in handleDisableOpen, or onKeyDown and onPointerDown events.
      */
      onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
        handleFocusEventsDebounced("mouseLeave");
        event.preventDefault();
      },
    };

    const onOpenChange = (isOpen: boolean) => {
      if (allowOpenRef.current) {
        setOpen(isOpen);
      }
    };

    // Wrap in provider so each control will use own hover delay
    return (
      <Tooltip
        {...props}
        open={open}
        onOpenChange={onOpenChange}
        triggerProps={triggerProps}
      />
    );
  }
);

EnhancedTooltip.displayName = "EnhancedTooltip";
