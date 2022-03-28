import { createDraft, finishDraft, enablePatches, type Patch } from "immer";
import { ValueContainer } from "react-nano-state";
import { Transaction } from "./transaction";
import { add } from "./transactions-manager";

enablePatches();

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
type Any = any;

const registry: Map<ValueContainer<Any>, string> = new Map();

export const register = <Value>(
  namespace: string,
  container: ValueContainer<Value>
) => {
  registry.set(container, namespace);
};

type UnwrapContainers<Containers extends Array<ValueContainer<unknown>>> = {
  [Index in keyof Containers]: Containers[Index] extends ValueContainer<
    infer Value
  >
    ? Value
    : never;
};

export const createTransaction = <
  Containers extends Array<ValueContainer<Any>>
>(
  containers: [...Containers],
  recipe: (...values: UnwrapContainers<Containers>) => void
): UnwrapContainers<Containers> => {
  type Values = UnwrapContainers<Containers>;
  const drafts = [] as unknown as Values;
  for (const container of containers) {
    drafts.push(createDraft(container.value));
  }
  recipe(...drafts);
  const transaction = new Transaction();
  const values = [] as unknown as Values;
  drafts.forEach((draft, index) => {
    const namespace = registry.get(containers[index]);
    if (namespace === undefined) {
      throw new Error(
        "Container used for transaction is not registered in sync engine"
      );
    }
    const value = finishDraft(
      draft,
      (patches: Array<Patch>, revisePatches: Array<Patch>) => {
        transaction.add({
          namespace,
          patches,
          revisePatches,
          container: containers[index],
        });
      }
    );
    values.push(value);
  });
  add(transaction);
  return values;
};
