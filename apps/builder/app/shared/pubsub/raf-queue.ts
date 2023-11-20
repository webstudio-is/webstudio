type Task = () => void;

let handle: ReturnType<typeof requestAnimationFrame> | undefined;
let updateQueue: Task[] = [];

const processUpdates = (updates: Task[]) => {
  for (const update of updates) {
    update();
  }
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
