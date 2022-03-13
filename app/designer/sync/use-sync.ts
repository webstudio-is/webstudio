import debounce from "lodash.debounce";
import {
  type ChildrenUpdates,
  type Instance,
  type DeleteProp,
  type UserPropsUpdates,
} from "@webstudio-is/sdk";
import type { Config } from "~/config";
import type { Project } from "~/shared/db";
import type {
  InstanceInsertionSpec,
  InstanceReparentingSpec,
} from "~/shared/tree-utils";
import type { StyleUpdates } from "~/shared/component";
import { useSubscribe } from "~/designer/iframe";
import { enqueue } from "./queue";

export const useSync = ({
  config,
  project,
}: {
  config: Config;
  project: Project;
}) => {
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
        body: JSON.stringify({ ...update, treeId: project.devTreeId }),
      })
    );
  });

  useSubscribe<"deleteProp", DeleteProp>(
    "deleteProp",
    ({ instanceId, propId }) => {
      enqueue(() =>
        fetch(`/rest/props/delete/${instanceId}`, {
          method: "post",
          body: JSON.stringify({ propId }),
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
