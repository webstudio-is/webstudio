import { enqueue } from "./sync-queue";
import { type Transaction } from "./transaction";

const max = 100;

const current: Array<Transaction> = [];
const undone: Array<Transaction> = [];

export const add = (transaction: Transaction) => {
  current.push(transaction);
  enqueue(transaction.id, transaction.getChanges());
  if (current.length > max) {
    current.shift();
  }
};

export const undo = () => {
  const transaction = current.pop();
  if (transaction === undefined) return;
  enqueue(transaction.id, transaction.getReviseChanges());
  undone.push(transaction);
  transaction.apply("revisePatches");
};

export const redo = () => {
  const transaction = undone.pop();
  if (transaction === undefined) return;
  enqueue(transaction.id, transaction.getChanges());
  add(transaction);
  transaction.apply("patches");
};
