export const canvasPointerEventsPropertyName = "--canvas-pointer-events";

export const enableCanvasPointerEvents = () => {
  document.documentElement.style.removeProperty(
    canvasPointerEventsPropertyName
  );
};

export const disableCanvasPointerEvents = () => {
  document.documentElement.style.setProperty(
    canvasPointerEventsPropertyName,
    "none"
  );
};
