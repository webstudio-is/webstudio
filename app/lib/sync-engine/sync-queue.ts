import { type Change } from "./transaction";

export type SyncItem = {
  transactionId: string;
  changes: Array<Change>;
};

const queue: Array<SyncItem> = [];

const dequeue = (transactionId: string) => {
  const index = queue.findIndex(
    (entry) => entry.transactionId === transactionId
  );
  if (index === -1) return false;
  queue.splice(index, 1);
  return true;
};

export const enqueue = (transactionId: string, changes: Array<Change>) => {
  // We are trying to delete that transaction from the queue,
  // if it was not found - we are adding the patches, because they are new
  // if it was found - we don't add it because it is technically an undo operation.
  // This can happen if user runs undo before sync happened, so we we are avoiding
  // sending it to the server unnecessarily.
  if (dequeue(transactionId) === false) {
    queue.push({ transactionId, changes });
  }
};

export const sync = () => {
  if (queue.length === 0) return [];
  const queueCopy = [...queue];
  queue.splice(0);
  return queueCopy;
};
