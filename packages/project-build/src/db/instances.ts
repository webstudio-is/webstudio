import { applyPatches, type Patch } from "immer";
import { type Project, type Build, prisma } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";
import { Instances, InstancesList } from "../schema/instances";

export const parseInstances = (instancesString: string): Instances => {
  const instancesList = InstancesList.parse(JSON.parse(instancesString));
  return new Map(instancesList.map((prop) => [prop.id, prop]));
};

export const serializeInstances = (instances: Instances) => {
  const instancesList: InstancesList = Array.from(instances.values());
  return JSON.stringify(instancesList);
};

export const patchInstances = async (
  { buildId, projectId }: { buildId: Build["id"]; projectId: Project["id"] },
  patches: Array<Patch>,
  context: AppContext
) => {
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );

  if (canEdit === false) {
    throw new Error("You don't have edit access to this project");
  }

  const build = await prisma.build.findUnique({
    where: {
      id_projectId: { projectId, id: buildId },
    },
  });
  if (build === null) {
    return;
  }
  const instances = parseInstances(build.instances);
  const patchedInstances = Instances.parse(applyPatches(instances, patches));

  await prisma.build.update({
    data: {
      instances: serializeInstances(patchedInstances),
    },
    where: {
      id_projectId: { projectId, id: buildId },
    },
  });
};
