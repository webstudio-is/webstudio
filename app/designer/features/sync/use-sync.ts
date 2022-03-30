import debounce from "lodash.debounce";
import {
  type ChildrenUpdates,
  type Instance,
  type DeleteProp,
  type UserPropsUpdates,
  type Project,
} from "@webstudio-is/sdk";
import type { Config } from "~/config";
import type { InstanceReparentingSpec } from "~/shared/tree-utils";
import type { StyleUpdates } from "~/shared/component";
import { useSubscribe } from "~/designer/features/canvas-iframe";
import { enqueue } from "./queue";
import { type SyncItem } from "~/lib/sync-engine";

// @todo this entire queueing logic needs to be gone, it's a workaround,
// because prisma can't do atomic updates yet with embeded documents
// and backend fetches and updates big objects, so if we send quickly,
// we end up overwriting things
export const useSync = ({ project }: { config: Config; project: Project }) => {
  useSubscribe<"syncInstanceReparenting", InstanceReparentingSpec>(
    "syncInstanceReparenting",
    (instanceReparentingSpec) => {
      enqueue(() =>
        fetch(`/rest/reparent-instance/${project.devTreeId}`, {
          method: "post",
          body: JSON.stringify(instanceReparentingSpec),
        })
      );
    }
  );

  useSubscribe<"updateStyles", StyleUpdates>(
    "updateStyles",
    debounce((styleUpdates) => {
      enqueue(() =>
        fetch(`/rest/update-styles/${project.devTreeId}`, {
          method: "post",
          body: JSON.stringify(styleUpdates),
        })
      );
    }, 1000)
  );

  useSubscribe<"updateProps", UserPropsUpdates>("updateProps", (update) => {
    enqueue(() =>
      fetch(`/rest/props/update`, {
        method: "post",
        body: JSON.stringify(update),
      })
    );
  });

  useSubscribe<"deleteProp", DeleteProp>(
    "deleteProp",
    ({ propsId, propId }) => {
      enqueue(() =>
        fetch(`/rest/props/delete-prop`, {
          method: "post",
          body: JSON.stringify({ propsId, propId }),
        })
      );
    }
  );

  useSubscribe<
    "syncInstanceChildrenChange",
    { instanceId: Instance["id"]; updates: ChildrenUpdates }
  >("syncInstanceChildrenChange", ({ instanceId, updates }) => {
    enqueue(() =>
      fetch(`/rest/update-children/${project.devTreeId}`, {
        method: "post",
        body: JSON.stringify({ instanceId, updates }),
      })
    );
  });

  useSubscribe<"syncChanges", Array<SyncItem>>("syncChanges", (queue) => {
    enqueue(() =>
      fetch(`/rest/patch/${project.devTreeId}`, {
        method: "post",
        body: JSON.stringify(queue),
      })
    );
  });
};
