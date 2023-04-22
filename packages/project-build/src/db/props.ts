import { applyPatches, type Patch } from "immer";
import { type Project, type Build, prisma } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { Props, PropsList } from "../schema/props";

export const parseProps = (
  propsString: string,
  skipValidation = false
): Props => {
  const propsList = skipValidation
    ? (JSON.parse(propsString) as PropsList)
    : PropsList.parse(JSON.parse(propsString));
  return new Map(propsList.map((prop) => [prop.id, prop]));
};

export const serializeProps = (props: Props) => {
  const propsList: PropsList = Array.from(props.values());
  return JSON.stringify(propsList);
};

export const patchProps = async (
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
  const props = parseProps(build.props);
  const patchedProps = Props.parse(applyPatches(props, patches));

  await prisma.build.update({
    data: {
      props: serializeProps(patchedProps),
    },
    where: {
      id_projectId: { projectId, id: buildId },
    },
  });
};
