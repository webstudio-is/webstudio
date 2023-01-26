import slugify from "slugify";
import { customAlphabet } from "nanoid";
import { User, prisma, Prisma, Project } from "@webstudio-is/prisma-client";
import * as db from "./index";
import type { AppContext } from "@webstudio-is/trpc-interface/server";

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
  if (typeof projectId !== "string") {
    throw new Error("Project ID required");
  }

  return await prisma.project.findUnique({
    where: { id: projectId },
  });
};

export const loadByDomain = async (
  domain: string,
  context: AppContext
): Promise<Project | null> => {
  return await prisma.project.findUnique({
    where: { domain: domain.toLowerCase() },
  });
};

export const loadManyByUserId = async (
  userId: User["id"],
  context: AppContext
): Promise<Array<Project>> => {
  return await prisma.project.findMany({
    where: {
      user: {
        id: userId,
      },
    },
  });
};

const slugifyOptions = { lower: true, strict: true };

const MIN_DOMAIN_LENGTH = 10;
const MIN_TITLE_LENGTH = 2;

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
  if (title.length < MIN_TITLE_LENGTH) {
    return { errors: `Minimum ${MIN_TITLE_LENGTH} characters required` };
  }

  const userId = context.authorization.userId;

  if (userId === undefined) {
    throw new Error("User ID is required to create project");
  }

  const project = await prisma.$transaction(async (client) => {
    const project = await client.project.create({
      data: {
        userId,
        title,
        domain: generateDomain(title),
      },
    });

    await db.build.create(project.id, "dev", undefined, client);

    return project;
  });

  return project;
};

export const markAsDeleted = async (
  projectId: Project["id"],
  context: AppContext
) => {
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
  if (title.length < MIN_TITLE_LENGTH) {
    return { errors: `Minimum ${MIN_TITLE_LENGTH} characters required` };
  }

  return await prisma.project.update({
    where: { id: projectId },
    data: { title },
  });
};

const clone = async (
  {
    project,
    userId,
    title,
    env = "dev",
  }: {
    project: Project;
    userId?: string;
    title?: string;
    env?: "dev" | "prod";
  },
  context: AppContext
) => {
  const build =
    env === "dev"
      ? await db.build.loadByProjectId(project.id, "dev")
      : await db.build.loadByProjectId(project.id, "prod");

  const clonedProject = await prisma.$transaction(async (client) => {
    const clonedProject = await client.project.create({
      data: {
        userId: userId ?? project.userId,
        title: title ?? project.title,
        domain: generateDomain(project.title),
      },
    });

    await db.build.create(clonedProject.id, "dev", build, client);

    return clonedProject;
  });

  return clonedProject;
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

export const cloneByDomain = async (
  domain: string,
  userId: string,
  context: AppContext
) => {
  const project = await loadByDomain(domain, context);
  if (project === null) {
    throw new Error(`Not found project "${domain}"`);
  }
  return await clone({ project, userId, env: "prod" }, context);
};

export const update = async (
  {
    id,
    ...data
  }: {
    id: string;
    domain?: string;
  },
  context: AppContext
) => {
  if (data.domain) {
    data.domain = slugify(data.domain, slugifyOptions);
    if (data.domain.length < MIN_DOMAIN_LENGTH) {
      throw new Error(`Minimum ${MIN_DOMAIN_LENGTH} characters required`);
    }
  }

  try {
    const project = await prisma.project.update({
      data,
      where: { id },
    });
    return project;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(`Domain "${data.domain}" is already used`);
    }
    throw error;
  }
};
