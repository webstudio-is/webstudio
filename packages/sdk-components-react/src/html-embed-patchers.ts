/* eslint-disable @typescript-eslint/no-explicit-any */
const isDOMContentLoaded = () => {
  return (
    document.readyState === "complete" || document.readyState === "interactive"
  );
};

const eventListenerTasks: Array<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  () => void
> = [];

let domContentLoadedPatched = false;

export const patchDomEvents = () => {
  // If original event is not fired yet, do nothing as it can cause serious side effects.
  if (isDOMContentLoaded() === false) {
    console.error("DOMContentLoaded event has not been fired yet");
    return;
  }

  if (domContentLoadedPatched) {
    return;
  }

  domContentLoadedPatched = true;

  console.info("Patching DOMContentLoaded event listener");

  const originalAddEventListener = document.addEventListener;
  const originalWindowAddEventListener = window.addEventListener;

  const domContentLoadedEvent = new Event("DOMContentLoaded");
  const windowLoadEvent = new Event("load");

  window.addEventListener = (type: any, listener: any, options?: any) => {
    if (type === "DOMContentLoaded") {
      eventListenerTasks.push(() =>
        listener.call(window, domContentLoadedEvent)
      );
      // We do not call original event listeners as everything is already loaded and orinal event is not going to be fired.
    } else if (type === "load") {
      // We store the listener to execute it later
      eventListenerTasks.push(() => listener.call(window, windowLoadEvent));
      originalWindowAddEventListener.call(window, type, listener, options);
    } else {
      // For all other events, use the original method

      originalWindowAddEventListener.call(window, type, listener, options);
    }
  };

  document.addEventListener = (type: any, listener: any, options: any) => {
    if (type === "DOMContentLoaded") {
      // We store the listener to execute it later
      eventListenerTasks.push(() =>
        listener.call(document, domContentLoadedEvent)
      );
      // We do not call original event listeners as everything is already loaded and orinal event is not going to be fired.
    } else {
      // For all other events, use the original method
      originalAddEventListener.call(document, type, listener, options);
    }
  };
};

export const executeDomEvents = () => {
  for (const task of eventListenerTasks) {
    task();
  }
  eventListenerTasks.length = 0;
};
