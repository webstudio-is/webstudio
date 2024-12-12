import { $canvasScrollbarWidth } from "~/builder/shared/nano-states";

export const subscribeScrollbarWidth = ({
  signal,
}: {
  signal: AbortSignal;
}) => {
  const getScrollbarWidth = () =>
    window.innerWidth - document.documentElement.clientWidth;

  let lastWidth = getScrollbarWidth();

  $canvasScrollbarWidth.set(lastWidth);

  const observer = new ResizeObserver(() => {
    const newWidth = getScrollbarWidth();
    if (newWidth !== lastWidth) {
      $canvasScrollbarWidth.set(newWidth);
      lastWidth = newWidth;
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
