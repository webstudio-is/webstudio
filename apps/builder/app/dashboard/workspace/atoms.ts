/**
 * Re-exports of the workspace-specific nanostores atoms.
 * Files inside the workspace/ feature folder import from here instead of
 * reaching up to ~/shared/nano-states, keeping workspace code self-contained.
 */
export { $workspaces, $workspaceRelation } from "~/shared/nano-states";
