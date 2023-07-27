import { useState, type RefObject, useEffect } from "react";

export const getIsVisuallyHidden = (currentElement: HTMLElement) => {
  for (
    let element: HTMLElement | null = currentElement;
    element !== null;
    element = element.parentElement
  ) {
    if (
      element.style.overflow === "hidden" &&
      element.style.clip === "rect(0px, 0px, 0px, 0px)" &&
      element.style.position === "absolute" &&
      element.style.width === "1px" &&
      element.style.height === "1px"
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Radix's VisuallyHiddenPrimitive.Root https://github.com/radix-ui/primitives/blob/main/packages/react/visually-hidden/src/VisuallyHidden.tsx
 * component makes content from hidden elements accessible to screen readers.
 * react-aria VisuallyHidden https://github.com/adobe/react-spectrum/blob/e4bc3269fa41aa096700445c6bfa9c8620545e6a/packages/%40react-aria/visually-hidden/src/VisuallyHidden.tsx#L32-L43
 * The problem we're addressing is that the Radix and similar frameworks reuse the same Content children
 * for VisuallyHiddenPrimitive.Root within the Tooltip and similar components.
 * Using the same Content children, however, leads to duplicated React elements, breaking our 'isSelected' logic.
 * To prevent this, we check if an instance is a descendant of VisuallyHiddenPrimitive.Root, and if so,
 * we avoid rendering it.
 */
export const useIsVisuallyHidden = (ref: RefObject<HTMLElement>) => {
  const [isVisuallyHidden, setIsVisuallyHidden] = useState(false);

  useEffect(() => {
    if (ref.current !== null && getIsVisuallyHidden(ref.current)) {
      setIsVisuallyHidden(true);
    }
  }, [ref]);

  return isVisuallyHidden;
};
