const scrollAhead = (element: HTMLElement, clientX: number) => {
  if (element.scrollWidth === element.clientWidth) {
    // Nothing to scroll.
    return false;
  }
  const inputRect = element.getBoundingClientRect();

  // Calculate the relative x position of the mouse within the input element
  const relativeMouseX = clientX - inputRect.x;

  // Calculate the percentage position (0% at the beginning, 100% at the end)
  const inputWidth = inputRect.width;
  const mousePercentageX = Math.ceil((relativeMouseX / inputWidth) * 100);

  // Apply acceleration based on the relative position of the mouse
  // Closer to the beginning (-20%), closer to the end (+20%)
  const accelerationFactor = (mousePercentageX - 50) / 50;
  const adjustedMousePercentageX = Math.min(
    Math.max(mousePercentageX + accelerationFactor * 20, 0),
    100
  );

  // Calculate the scroll position corresponding to the adjusted percentage
  const scrollPosition =
    (adjustedMousePercentageX / 100) *
    (element.scrollWidth - element.clientWidth);

  // Scroll the input element
  element.scroll({ left: scrollPosition });
  return true;
};

// We don't want to scroll if the element is focused.
// E.g. this is important for inputs, where the user might be interacting with text.
const isFocused = (element: HTMLElement) => element === document.activeElement;

/**
 * Scroll any element horizontally based on pointer position.
 * Used in CSSValueInput and Spacing UI to show a string that is too long.
 */
export const scrollByPointer = () => {
  let abortController = new AbortController();

  const abort = (reason: string) => {
    abortController.abort(reason);
  };

  const onMouseOver = (event: React.MouseEvent) => {
    const element = event.currentTarget;
    if (element instanceof HTMLElement === false) {
      return;
    }
    if (isFocused(element)) {
      abort("focused");
      return;
    }
    if (scrollAhead(element, event.clientX) === false) {
      return;
    }

    abortController = new AbortController();
    element?.addEventListener(
      "mousemove",
      (event: MouseEvent) => {
        const element = event.currentTarget;
        if (element instanceof HTMLElement === false) {
          return;
        }

        if (isFocused(element)) {
          abort("focused");
          return;
        }
        requestAnimationFrame(() => {
          scrollAhead(element, event.clientX);
        });
      },
      {
        signal: abortController.signal,
        passive: true,
      }
    );
  };

  const onMouseOut = (event: React.MouseEvent) => {
    abort("mouseout");
    const element = event.currentTarget;
    if (element instanceof HTMLElement === false) {
      return;
    }
    if (isFocused(element)) {
      abort("focused");
      return;
    }
    element.scroll({
      left: 0,
      behavior: "smooth",
    });
  };

  return {
    abort,
    onMouseOver,
    onMouseOut,
    onFocus() {
      abort("focus");
    },
  };
};
