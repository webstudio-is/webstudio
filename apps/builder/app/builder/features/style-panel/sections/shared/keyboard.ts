import { useState, useRef } from "react";
import type { FocusEvent, FocusEventHandler, KeyboardEvent } from "react";
import { useDebouncedCallback } from "use-debounce";

const movementKeys = [
  "ArrowUp",
  "ArrowRight",
  "ArrowDown",
  "ArrowLeft",
] as const;

/**
 * useFocusWithin does't work with popovers, implement it using debounce
 */
const useFocusWithinDebounce = (
  props: {
    onFocusWithin: FocusEventHandler<Element>;
    onBlurWithin: FocusEventHandler<Element>;
  },
  timeout: number
) => {
  const isFocusedRef = useRef(false);

  const handleFocusBlur = useDebouncedCallback(
    (isFocus: boolean, event: FocusEvent<Element>) => {
      if (isFocus && isFocusedRef.current === false) {
        isFocusedRef.current = true;
        props.onFocusWithin(event);
        return;
      }
      if (isFocus === false && isFocusedRef.current === true) {
        isFocusedRef.current = false;
        props.onBlurWithin(event);
      }
    },
    timeout
  );

  const handleFocus = (event: FocusEvent<Element>) => {
    // ...event because we debounce handleFocusBlur, and react reuses events
    handleFocusBlur(true, { ...event });
  };

  const handleBlur = (event: FocusEvent<Element>) => {
    handleFocusBlur(false, event);
  };

  return {
    onFocus: handleFocus,
    onBlur: handleBlur,
  };
};

export const useKeyboardNavigation = <
  P extends string,
  T extends {
    readonly [key in P]: readonly [
      ArrowUp: P,
      ArrowRight: P,
      ArrowDown: P,
      ArrowLeft: P,
    ];
  },
>({
  onOpen,
  movementMap,
}: {
  onOpen: (property: keyof T) => void;
  movementMap: T;
}) => {
  const [activeProperty, setActiveProperty] = useState<keyof T>(
    Object.keys(movementMap)[0] as P
  );

  const [hoverActiveProperty, setHoverActiveProperty] = useState<keyof T>(
    Object.keys(movementMap)[0] as P
  );

  const [isActive, setIsActive] = useState(false);

  const isMouseInsideRef = useRef(false);

  const handleActiveChange = (value: boolean) => {
    setIsActive(value);

    if (value === false) {
      setActiveProperty(hoverActiveProperty);
    }
  };

  const handleFocusInternal = (event: FocusEvent<Element>) => {
    if (event.currentTarget.matches(":focus-visible")) {
      handleActiveChange(true);
    }
  };

  const handleBlurInternal = () => {
    handleActiveChange(false);
  };

  const { onFocus: handleFocus, onBlur: handleBlur } = useFocusWithinDebounce(
    {
      onFocusWithin: handleFocusInternal,
      onBlurWithin: handleBlurInternal,
    },
    100
  );

  const handleHover = (property: keyof T | undefined) => {
    // keep active property in sync with hover (makes UX more intuitive)
    if (property) {
      setHoverActiveProperty(property);
      if (isActive === false) {
        setActiveProperty(property);
      }
    }
  };

  const handleMouseMove = () => {
    handleActiveChange(false);
    isMouseInsideRef.current = true;
  };

  const handleMouseLeave = () => {
    isMouseInsideRef.current = false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // ignore events originating from popover input or something
    if (event.target !== event.currentTarget) {
      return;
    }

    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowRight" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft"
    ) {
      event.preventDefault(); // prevent scrolling
      const key = event.key;

      handleActiveChange(true);

      if (isActive || isMouseInsideRef.current) {
        setActiveProperty(
          (property) => movementMap[property][movementKeys.indexOf(key)]
        );
      }
    }

    if (event.key === "Enter") {
      handleActiveChange(true);
      event.preventDefault(); // not sure we need this, but just in case
      onOpen(activeProperty);
    }
  };

  return {
    activeProperty,
    isActive,
    handleHover,
    // these are supposed to be put on the root element of the control
    handleMouseMove,
    handleMouseLeave,
    handleFocus,
    handleBlur,
    handleKeyDown,
  };
};
