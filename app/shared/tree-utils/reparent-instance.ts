import produce from "immer";
import { type Instance } from "@webstudio-is/sdk";
import { findInstanceById } from "./find-instance";
import { deleteInstanceMutable } from "./delete-instance";
import {
  insertInstanceMutable,
  type InstanceInsertionSpec,
} from "./insert-instance";

export type InstanceReparentingSpec = {
  id: Instance["id"];
  parentId: Instance["id"];
  position: InstanceInsertionSpec["position"];
};

export const reparentInstance = produce(
  (draftRootInstance: Instance, spec: InstanceReparentingSpec) => {
    const instance = findInstanceById(draftRootInstance, spec.id);
    if (instance === undefined) return;
    deleteInstanceMutable(draftRootInstance, instance.id);
    insertInstanceMutable(draftRootInstance, instance, spec);
  }
);
