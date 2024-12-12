import { shallowEqual } from "shallow-equal";
import { $canvasScrollbarSize } from "~/builder/shared/nano-states";

export const subscribeScrollbarSize = ({ signal }: { signal: AbortSignal }) => {
  const getScrollbarSize = () => ({
    width: window.innerWidth - document.documentElement.clientWidth,
    height: window.innerHeight - document.documentElement.clientHeight,
  });

  $canvasScrollbarSize.set(getScrollbarSize());

  const observer = new ResizeObserver(() => {
    const newSize = getScrollbarSize();
    if (!shallowEqual($canvasScrollbarSize.get(), newSize)) {
      $canvasScrollbarSize.set(newSize);
    }
  });

  observer.observe(document.documentElement);

  signal.addEventListener(
    "abort",
    () => {
      observer.disconnect();
    },
    { once: true }
  );
};
