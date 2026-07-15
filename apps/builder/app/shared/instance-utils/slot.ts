// Slot boundary and legacy Fragment normalization rules live in project-build
// so runtime operations and Builder UI use the same model.
import {
  countInstanceChildReferences,
  findClosestSlot,
  getDirectSharedSlotChildBoundary,
  getSharedSlotBoundary,
  getSlotFragmentId,
  type SharedSlotBoundary,
} from "@webstudio-is/project-build/runtime";

export {
  countInstanceChildReferences,
  findClosestSlot,
  getDirectSharedSlotChildBoundary,
  getSharedSlotBoundary,
  getSlotFragmentId,
  type SharedSlotBoundary,
};
