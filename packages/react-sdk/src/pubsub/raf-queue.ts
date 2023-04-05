import { unstable_batchedUpdates as batchedUpdates } from "react-dom";

type Task = () => void;

let handle: ReturnType<typeof requestAnimationFrame> | undefined;
let updateQueue: Task[] = [];

const processUpdates = (updates: Task[]) => {
  // Prior to React v18, updates not called within React event handlers would not be batched
  // To ensure all updates are batched into a single React update, we wrap them in a batchedUpdates callback
  batchedUpdates(() => {
    for (const update of updates) {
      update();
    }
  });
};

export const batchUpdate = (update: () => void) => {
  updateQueue.push(update);

  if (handle !== undefined) {
    return;
  }

  handle = requestAnimationFrame(() => {
    const updates = updateQueue;
    updateQueue = [];
    handle = undefined;
    processUpdates(updates);
  });
};
