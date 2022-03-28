import { enqueue } from "./sync-queue";
import { type Transaction } from "./transaction";

const max = 100;

const currentStack: Array<Transaction> = [];
const undoneStack: Array<Transaction> = [];

export const add = (transaction: Transaction) => {
  transaction.applyPatches();
  currentStack.push(transaction);
  enqueue(transaction.id, transaction.getChanges());
  if (currentStack.length > max) {
    currentStack.shift();
  }
  // After we add a change, we can't redo something we have undone before.
  // It would make undo unpredictable, because there are new changes.
  undoneStack.splice(0);
};

export const undo = () => {
  const transaction = currentStack.pop();
  if (transaction === undefined) return;
  transaction.applyRevisePatches();
  enqueue(transaction.id, transaction.getReviseChanges());
  undoneStack.push(transaction);
};

export const redo = () => {
  const transaction = undoneStack.pop();
  if (transaction === undefined) return;
  transaction.applyPatches();
  currentStack.push(transaction);
  enqueue(transaction.id, transaction.getChanges());
};
