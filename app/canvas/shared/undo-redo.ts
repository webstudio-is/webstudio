import { emitter } from "@webstudio-is/sdk";
import { publish } from "~/canvas/shared/pubsub";

const types = ["insertInstance"] as const;

const maxLength = 100;

type Action = {
  type: typeof types[number];
  payload: unknown;
};

const current: Array<Action> = [];
const undone: Array<Action> = [];

export const add = (action: Action) => {
  current.push(action);
  if (history.length >= maxLength) {
    current.shift();
  }
  // Undone items can't be redone if user adds another change to the current list.
  // It's artificial, but that's how we know it.
  undone.splice(0);
};

export const initUndoRedo = () => {
  for (const type of types) {
    emitter.on(type, (payload) => {
      add({ type, payload });
    });
  }
};

export const undo = () => {
  const action = current.pop();
  if (action === undefined) return;
  undone.push(action);
  publish({
    type: action.type + "Undo",
    payload: action.payload,
  });
};

export const redo = () => {
  const action = undone.pop();
  if (action === undefined) return;
  current.push(action);
  publish(action);
};
