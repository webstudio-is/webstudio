import React, {
  Ref,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent,
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

/**
 * EnhancedTooltip has the following differences from the radix-ui
 * 1. Don't show the tooltip if any click or key-down was made inside Tooltip.Trigger
 * 2. Show Tooltip on focus after the delay
 **/
export const EnhancedTooltip = React.forwardRef(
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
      (eventType: "focus" | "blur") => {
        if (eventType === "blur") {
          isFocusedRef.current = false;
          allowOpenRef.current = true;
          setOpen(false);
          showTooltipDelayed.cancel();
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
