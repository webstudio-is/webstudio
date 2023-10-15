import {
  getAllElementsBoundingBox,
  getElementsByInstanceSelector,
} from "~/shared/dom-utils";
import {
  $collaborativeInstanceSelector,
  $collaborativeInstanceRect,
} from "~/shared/nano-states";

export const updateCollaborativeInstanceRect = () => {
  let frameHandler: number = -1;
  let elements: HTMLElement[] = [];

  const frameLoop = () => {
    const newRect = getAllElementsBoundingBox(elements);
    const prevRect = $collaborativeInstanceRect.get();

    if (
      newRect.x !== prevRect?.x ||
      newRect.y !== prevRect?.y ||
      newRect.width !== prevRect?.width ||
      newRect.height !== prevRect?.height
    ) {
      $collaborativeInstanceRect.set(newRect);
    }

    frameHandler = requestAnimationFrame(frameLoop);
  };

  const unsubscribe = $collaborativeInstanceSelector.subscribe((selector) => {
    if (selector === undefined) {
      cancelAnimationFrame(frameHandler);
      $collaborativeInstanceRect.set(undefined);
      elements = [];
      return;
    }

    elements = getElementsByInstanceSelector(selector);

    if (elements.length > 0) {
      cancelAnimationFrame(frameHandler);
      frameLoop();
    }
  });

  return () => {
    unsubscribe();
    cancelAnimationFrame(frameHandler);
  };
};
