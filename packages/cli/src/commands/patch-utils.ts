import {
  buildPatchNamespaces,
  buildPatchTransaction,
  type BuildPatchTransaction,
} from "@webstudio-is/protocol";
import { z } from "zod";
import { formatZodIssues } from "../zod-utils";
export { buildPatchNamespaces };
export type { BuildPatchTransaction };

export const parsePatchTransactions = (input: unknown) => {
  const transactions =
    typeof input === "object" && input !== null && "transactions" in input
      ? (input as { transactions: unknown }).transactions
      : input;
  const result = z.array(buildPatchTransaction).safeParse(transactions);
  if (result.success === false) {
    throw new Error(
      `Invalid patch JSON: ${formatZodIssues(result.error.issues)}`
    );
  }
  return result.data;
};

export const getPatchSummary = (transactions: BuildPatchTransaction[]) => {
  const namespaces = new Set<(typeof buildPatchNamespaces)[number]>();
  let patchCount = 0;
  for (const transaction of transactions) {
    for (const item of transaction.payload) {
      namespaces.add(item.namespace);
      patchCount += item.patches.length;
    }
  }
  return {
    transactionCount: transactions.length,
    patchCount,
    namespaces: [...namespaces],
  };
};
