import type { Transaction } from "./types";

export const stripRevisePatchesFromPayload = <Payload>(
  payload: Payload
): Payload => {
  if (!Array.isArray(payload)) {
    return payload;
  }
  let changed = false;
  const nextPayload = payload.map((entry) => {
    if (
      entry === null ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      !Object.hasOwn(entry, "revisePatches")
    ) {
      return entry;
    }
    changed = true;
    const { revisePatches: _revisePatches, ...rest } = entry as Record<
      string,
      unknown
    >;
    return rest;
  });

  if (!changed) {
    return payload;
  }
  return nextPayload as Payload;
};

export const stripRevisePatchesFromTransaction = (
  transaction: Transaction
): Transaction => {
  if (transaction.object !== "server") {
    return transaction;
  }

  const payload = stripRevisePatchesFromPayload(transaction.payload);
  if (payload === transaction.payload) {
    return transaction;
  }

  return {
    ...transaction,
    payload,
  };
};
