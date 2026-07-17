import type { WebstudioFragment } from "@webstudio-is/sdk";
import { detectFragmentTokenConflicts } from "@webstudio-is/project-build/runtime";
import { builderApi } from "./builder-api";
import { getWebstudioData } from "./instance-utils/data";
import type {
  TokenConflictDialogConflict,
  TokenConflictDialogResult,
} from "./token-conflict-dialog";

export const resolveTokenConflicts = async (
  conflicts: TokenConflictDialogConflict[]
): Promise<TokenConflictDialogResult> =>
  conflicts.length === 0
    ? "theirs"
    : builderApi.showTokenConflictDialog(conflicts);

export const resolveFragmentTokenConflicts = (
  fragment: WebstudioFragment
): Promise<TokenConflictDialogResult> => {
  if (
    fragment.styleSources.some((source) => source.type === "token") === false
  ) {
    return Promise.resolve("theirs");
  }
  return resolveTokenConflicts(
    detectFragmentTokenConflicts({
      fragment,
      targetData: getWebstudioData(),
    })
  );
};
