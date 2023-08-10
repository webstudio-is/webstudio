export const canvasPointerEventsPropertyName = "--canvas-pointer-events";

let disableCount = 0;

const updateCanvasPointerEvents = () => {
  if (disableCount < 0) {
    // Should be impossible as counter control implemented as disposable resource
    throw new Error("canvas pointer event counter can't be less than 0");
  }

  // use ===1 instead of >0 for optimisation
  if (disableCount === 1) {
    document.documentElement.style.setProperty(
      canvasPointerEventsPropertyName,
      "none"
    );
    return;
  }

  if (disableCount === 0) {
    document.documentElement.style.removeProperty(
      canvasPointerEventsPropertyName
    );
  }
};

/**
 * Temporarily disables pointer events on the canvas using canvasPointerEventsPropertyName.
 * Use the returned disposable to re-enable them.
 *
 * Implemented as disposable to
 * - Ensure events are first disabled, then enabled in sequence.
 * - To support concurrent calls (internal counter tracks the number of disables/enables).
 **/
export const disableCanvasPointerEvents = () => {
  let disposeCalled = false;

  disableCount += 1;
  updateCanvasPointerEvents();

  return () => {
    if (disposeCalled) {
      // It's perfectly ok to dispose multiple times.
      return;
    }
    disposeCalled = true;
    disableCount -= 1;
    updateCanvasPointerEvents();
  };
};
