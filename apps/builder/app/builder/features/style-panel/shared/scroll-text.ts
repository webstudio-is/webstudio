const scrollAhead = ({ target, clientX }: MouseEvent) => {
  const element = target as HTMLInputElement;
  console.log(element.scrollWidth, element.clientWidth);
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
  console.log({
    scrollPosition,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    adjustedMousePercentageX,
  });
  // Scroll the input element
  element.scroll({ left: scrollPosition });
  return true;
};

export const getAutoScrollProps = () => {
  let abortController = new AbortController();

  const abort = (reason: string) => {
    abortController.abort(reason);
  };

  return {
    abort,
    onMouseOver(event: MouseEvent) {
      if (event.target === document.activeElement) {
        abort("focused");
        return;
      }
      console.log(1111, scrollAhead(event));
      if (scrollAhead(event) === false) {
        //return;
      }

      abortController = new AbortController();
      event.target?.addEventListener(
        "mousemove",
        (event) => {
          if (event.target === document.activeElement) {
            abort("focused");
            return;
          }
          requestAnimationFrame(() => {
            scrollAhead(event as MouseEvent);
          });
        },
        {
          signal: abortController.signal,
          passive: true,
        }
      );
    },
    onMouseOut(event: MouseEvent) {
      if (event.target === document.activeElement) {
        abort("focused");
        return;
      }
      (event.target as HTMLInputElement).scroll({
        left: 0,
        behavior: "smooth",
      });
      abort("mouseout");
    },
    onFocus() {
      abort("focus");
    },
  };
};
