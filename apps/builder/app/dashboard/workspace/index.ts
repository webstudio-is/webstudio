// UI components
export { WorkspaceSelector } from "./selector";
export { WorkspaceDropdown } from "./dropdown";
export type { WorkspaceDropdownGroup, WorkspaceDropdownItem } from "./dropdown";

// Dialogs (CreateWorkspaceDialog, RenameWorkspaceDialog, ManageMembersDialog, etc.)
export {
  CreateWorkspaceDialog,
  RenameWorkspaceDialog,
  ManageMembersDialog,
  DeleteWorkspaceDialog,
  LeaveWorkspaceDialog,
} from "./dialogs";

// Pure utilities
export { resolveCurrentWorkspace, isDowngradedForMember } from "./utils";

// Atoms
export { $workspaces, $workspaceRelation } from "./atoms";
