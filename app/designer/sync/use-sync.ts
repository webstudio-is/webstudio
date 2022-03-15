import debounce from "lodash.debounce";
import {
  type ChildrenUpdates,
  type Instance,
  type DeleteProp,
  type UserPropsUpdates,
  type Project,
} from "@webstudio-is/sdk";
import type { Config } from "~/config";
import type {
  InstanceInsertionSpec,
  InstanceReparentingSpec,
} from "~/shared/tree-utils";
import type { StyleUpdates } from "~/shared/component";
import { useSubscribe } from "~/designer/iframe";
import { enqueue } from "./queue";

// @todo this entire queueing logic needs to be gone, it's a workaround,
// because prisma can't do atomic updates yet with embeded documents
// and backend fetches and updates big objects, so if we send quickly,
// we end up overwriting things
export const useSync = ({ project }: { config: Config; project: Project }) => {
  useSubscribe<"syncInstanceInsertion", InstanceInsertionSpec>(
    "syncInstanceInsertion",
    (instanceInsertionSpec) => {
      enqueue(() =>
        fetch(`/rest/insert-instance/${project.devTreeId}`, {
          method: "post",
          body: JSON.stringify(instanceInsertionSpec),
        })
      );
    }
  );

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

  useSubscribe<"deleteSelectedInstance", { id: Instance["id"] }>(
    "deleteSelectedInstance",
    ({ id }) => {
      enqueue(() =>
        fetch(`/rest/delete-instance/${project.devTreeId}`, {
          method: "post",
          body: JSON.stringify({ instanceId: id }),
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
};
