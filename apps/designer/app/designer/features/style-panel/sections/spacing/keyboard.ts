import { useState } from "react";
import type { FocusEvent, KeyboardEvent, MouseEvent } from "react";
import type { SpacingStyleProperty } from "./types";

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
  onOpen: (property: SpacingStyleProperty) => void;
}) => {
  const [activeProperty, setActiveProperty] =
    useState<SpacingStyleProperty>("marginTop");

  const [isActive, setIsActive] = useState(false);

  const hadnleFocus = (event: FocusEvent<HTMLElement>) => {
    if (event.currentTarget.matches(":focus-visible")) {
      setIsActive(true);
    }
  };

  const handleBlur = () => {
    setIsActive(false);
  };

  const handleHover = (property: SpacingStyleProperty | undefined) => {
    // switch to mouse navigation if user starts to use mouse
    setIsActive(false);

    // keep active property in sync with hover (makes UX more intuitive)
    if (property) {
      setActiveProperty(property);
    }
  };

  // switch back to keyboard navigation on mouse leave
  const handleMouseLeave = (event: MouseEvent<HTMLElement>) => {
    if (event.currentTarget.matches(":focus-visible")) {
      setIsActive(true);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // ignore events originating from popover input or something
    if (event.target !== event.currentTarget) {
      return;
    }

    // 1. handle transition from :focus to :focus-visible
    // 2. switch from mouse navigation back to keyboard navigation if user starts to use keyboard
    if (event.currentTarget.matches(":focus-visible")) {
      setIsActive(true);
    }

    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowRight" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft"
    ) {
      event.preventDefault(); // prevent scrolling
      const key = event.key;
      setActiveProperty(
        (property) => movementMap[property][movementKeys.indexOf(key)]
      );
    }

    if (event.key === "Enter") {
      event.preventDefault(); // not sure we need this, but just in case
      onOpen(activeProperty);
    }
  };

  return {
    activeProperty,
    isActive,
    handleHover,

    // these are supposed to be put on the root element of the control
    hadnleFocus,
    handleBlur,
    handleKeyDown,
    handleMouseLeave,
  };
};
