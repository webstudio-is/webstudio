import { useState, useRef } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import type { SpaceStyleProperty } from "./types";

const movementKeys = [
  "ArrowUp",
  "ArrowRight",
  "ArrowDown",
  "ArrowLeft",
] as const;

const movementMap = {
  marginTop: ["marginBottom", "marginRight", "paddingTop", "marginLeft"],
  marginRight: ["marginTop", "marginLeft", "marginBottom", "paddingRight"],
  marginBottom: ["paddingBottom", "marginRight", "marginTop", "marginLeft"],
  marginLeft: ["marginTop", "paddingLeft", "marginBottom", "marginRight"],
  paddingTop: ["marginTop", "paddingRight", "paddingBottom", "paddingLeft"],
  paddingRight: ["paddingTop", "marginRight", "paddingBottom", "paddingBottom"],
  paddingBottom: ["paddingTop", "paddingRight", "marginBottom", "paddingLeft"],
  paddingLeft: ["paddingTop", "paddingTop", "paddingBottom", "marginLeft"],
} as const;

export const useKeyboardNavigation = ({
  onOpen,
}: {
  onOpen: (property: SpaceStyleProperty) => void;
}) => {
  const [activeProperty, setActiveProperty] =
    useState<SpaceStyleProperty>("marginTop");

  const [hoverActiveProperty, setHoverActiveProperty] =
    useState<SpaceStyleProperty>("marginTop");

  const [isActive, setIsActive] = useState(false);

  const isMouseInsideRef = useRef(false);

  const handleActiveChange = (value: boolean) => {
    setIsActive(value);

    if (value === false) {
      setActiveProperty(hoverActiveProperty);
    }
  };

  const handleFocus = (event: FocusEvent<Element>) => {
    if (event.currentTarget.matches(":focus-visible")) {
      handleActiveChange(true);
    }
  };

  const handleBlur = () => {
    handleActiveChange(false);
  };

  const handleHover = (property: SpaceStyleProperty | undefined) => {
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
