import type { ConflictResolution } from "@webstudio-is/project-build/runtime";
import { builderApi } from "./builder-api";
import type {
  TokenConflictDialogConflict,
  TokenConflictDialogResult,
} from "./token-conflict-dialog";

export const resolveTokenConflicts = async (
  conflicts: TokenConflictDialogConflict[],
  fallback: ConflictResolution = "theirs"
): Promise<TokenConflictDialogResult> =>
  conflicts.length === 0
    ? fallback
    : await builderApi.showTokenConflictDialog(conflicts);
