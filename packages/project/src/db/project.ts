import slugify from "slugify";
import { customAlphabet } from "nanoid";
import { User, prisma, Prisma, Project } from "@webstudio-is/prisma-client";
import * as db from "./index";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz");

export const loadByParams = async (
  params: { projectId: string } | { projectDomain: string }
) => {
  return "projectId" in params
    ? await loadById(params.projectId)
    : await loadByDomain(params.projectDomain);
};

export const loadById = async (projectId?: Project["id"]) => {
  if (typeof projectId !== "string") {
    throw new Error("Project ID required");
  }

  return await prisma.project.findUnique({
    where: { id: projectId },
  });
};

export const loadByDomain = async (domain: string): Promise<Project | null> => {
  return await prisma.project.findUnique({
    where: { domain: domain.toLowerCase() },
  });
};

export const loadManyByUserId = async (
  userId: User["id"]
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

export const create = async ({
  userId,
  title,
}: {
  userId: string;
  title: string;
}) => {
  if (title.length < MIN_TITLE_LENGTH) {
    throw new Error(`Minimum ${MIN_TITLE_LENGTH} characters required`);
  }

  const project = await prisma.project.create({
    data: {
      userId,
      title,
      domain: generateDomain(title),
    },
  });

  await db.build.create(project.id, "dev");

  return project;
};

export const clone = async (clonableDomain: string, userId: string) => {
  const clonableProject = await loadByDomain(clonableDomain);
  if (clonableProject === null) {
    throw new Error(`Not found project "${clonableDomain}"`);
  }

  const prodBuild = await db.build.loadByProjectId(clonableProject.id, "prod");

  if (prodBuild === undefined) {
    throw new Error("Expected project to be published first");
  }

  const project = await prisma.project.create({
    data: {
      userId,
      title: clonableProject.title,
      domain: generateDomain(clonableProject.title),
    },
  });

  await db.build.create(project.id, "dev", prodBuild);

  return project;
};

export const update = async ({
  id,
  ...data
}: {
  id: string;
  domain?: string;
}) => {
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
