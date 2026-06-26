import {
  getBuildPatchSummary,
  parseBuildPatchTransactions,
} from "@webstudio-is/http-client";
import { buildPatchNamespaces } from "@webstudio-is/protocol";
export { buildPatchNamespaces };
export type { BuildPatchTransaction } from "@webstudio-is/http-client";

export const parsePatchTransactions = parseBuildPatchTransactions;
export const getPatchSummary = getBuildPatchSummary;
