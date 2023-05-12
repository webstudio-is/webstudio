import slugify from "slugify";
import { customAlphabet } from "nanoid";
import { v4 as uuid } from "uuid";
import { prisma, Prisma } from "@webstudio-is/prisma-client";
import { cloneAssets } from "@webstudio-is/asset-uploader/index.server";
import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import {
  createBuild,
  loadBuildByProjectId,
} from "@webstudio-is/project-build/index.server";
import { Project, Title } from "../shared/schema";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz");

export const loadByParams = async (
  params: { projectId: string } | { projectDomain: string },
  context: AppContext
) => {
  return "projectId" in params
    ? await loadById(params.projectId, context)
    : await loadByDomain(params.projectDomain, context);
};

export const loadById = async (
  projectId: Project["id"],
  context: AppContext
) => {
  const canRead = await authorizeProject.hasProjectPermit(
    { projectId, permit: "view" },
    context
  );

  if (canRead === false) {
    throw new AuthorizationError("You don't have access to this project");
  }

  const data = await prisma.project.findUnique({
    where: { id_isDeleted: { id: projectId, isDeleted: false } },
  });

  return Project.parse(data);
};

export const loadByDomain = async (
  domain: string,
  context: AppContext
): Promise<Project | null> => {
  // The authorization system needs the project id to check if the user has access to the project
  const projectWithId = await prisma.project.findUnique({
    where: {
      domain_isDeleted: { domain: domain.toLowerCase(), isDeleted: false },
    },
  });

  if (projectWithId === null) {
    return null;
  }

  // Edge case for webstudiois project
  if (projectWithId.domain === "webstudiois") {
    // Hardcode for now that everyone can duplicate webstudiois project
    return Project.parse(projectWithId);
  }

  // Otherwise, check if the user has access to the project
  return await loadById(projectWithId.id, context);
};

const slugifyOptions = { lower: true, strict: true };

const MIN_DOMAIN_LENGTH = 10;

const generateDomain = (title: string) => {
  const slugifiedTitle = slugify(title, slugifyOptions);
  const domain = `${slugifiedTitle}-${nanoid(
    // If user entered a long title already, we just add 5 chars generated id
    // Otherwise we add the amount of chars to satisfy min length
    Math.max(MIN_DOMAIN_LENGTH - slugifiedTitle.length - 1, 5)
  )}`;
  return domain;
};

export const create = async (
  { title }: { title: string },
  context: AppContext
) => {
  Title.parse(title);

  const userId = context.authorization.userId;

  if (userId === undefined) {
    throw new Error("The user must be authenticated to create a project");
  }

  const projectId = uuid();
  authorizeProject.registerProjectOwner({ projectId }, context);

  const project = await prisma.$transaction(async (client) => {
    const project = await client.project.create({
      data: {
        id: projectId,
        userId,
        title,
        domain: generateDomain(title),
      },
    });

    await createBuild(
      { projectId: project.id, env: "dev", sourceBuild: undefined },
      context,
      client
    );

    return project;
  });

  return project;
};

export const markAsDeleted = async (
  projectId: Project["id"],
  context: AppContext
) => {
  const canDelete = await authorizeProject.hasProjectPermit(
    { projectId, permit: "own" },
    context
  );

  if (canDelete === false) {
    return { errors: "Only the owner can delete the project" };
  }

  return await prisma.project.update({
    where: { id: projectId },
    data: { isDeleted: true },
  });
};

export const rename = async (
  {
    projectId,
    title,
  }: {
    projectId: Project["id"];
    title: string;
  },
  context: AppContext
) => {
  Title.parse(title);

  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );

  if (canEdit === false) {
    throw new Error(
      "Only a token or user with edit permission can edit the project."
    );
  }

  return await prisma.project.update({
    where: { id: projectId },
    data: { title },
  });
};

const clone = async (
  {
    project,
    title,
    env = "dev",
  }: {
    project: Project;
    title?: string;
    env?: "dev" | "prod";
  },
  context: AppContext
) => {
  const userId = context.authorization.userId;

  if (userId === undefined) {
    throw new Error("The user must be authenticated to clone the project");
  }

  const build =
    env === "dev"
      ? await loadBuildByProjectId(project.id, "dev")
      : await loadBuildByProjectId(project.id, "prod");

  const newProjectId = uuid();
  await authorizeProject.registerProjectOwner(
    { projectId: newProjectId },
    context
  );

  const clonedProject = await prisma.$transaction(async (client) => {
    const clonedProject = await client.project.create({
      data: {
        id: newProjectId,
        userId: userId,
        title: title ?? project.title,
        domain: generateDomain(project.title),
      },
    });

    await createBuild(
      { projectId: newProjectId, env: "dev", sourceBuild: build },
      context,
      client
    );

    await cloneAssets(
      {
        fromProjectId: project.id,
        toProjectId: newProjectId,

        // Permission check on newProjectId will fail until this transaction is committed.
        // We have to skip it, but it's ok because registerProjectOwner is right above
        dontCheckEditPermission: true,
      },
      context
    );

    return clonedProject;
  });

  return Project.parse(clonedProject);
};

export const duplicate = async (projectId: string, context: AppContext) => {
  const project = await loadById(projectId, context);
  if (project === null) {
    throw new Error(`Not found project "${projectId}"`);
  }
  return await clone(
    {
      project,
      title: `${project.title} (copy)`,
    },
    context
  );
};

export const cloneByDomain = async (domain: string, context: AppContext) => {
  const project = await loadByDomain(domain, context);

  if (project === null) {
    throw new Error(`Not found project "${domain}"`);
  }

  return await clone({ project, env: "prod" }, context);
};

export const updateDomain = async (
  input: {
    id: string;
    domain: string;
  },
  context: AppContext
) => {
  const domain = slugify(input.domain, slugifyOptions);

  if (domain.length < MIN_DOMAIN_LENGTH) {
    throw new Error(`Minimum ${MIN_DOMAIN_LENGTH} characters required`);
  }

  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId: input.id, permit: "edit" },
    context
  );

  if (canEdit === false) {
    throw new Error(
      "Only a token or user with edit permission can edit the project."
    );
  }

  try {
    const project = await prisma.project.update({
      data: { domain },
      where: { id: input.id },
    });
    return project;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(`Domain "${domain}" is already used`);
    }
    throw error;
  }
};
