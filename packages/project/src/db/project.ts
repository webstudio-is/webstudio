import slugify from "slugify";
import { customAlphabet } from "nanoid";
import {
  User,
  prisma,
  Prisma,
  Project as BaseProject,
} from "@webstudio-is/prisma-client";
import type { Asset } from "@webstudio-is/asset-uploader";
import { formatAsset } from "@webstudio-is/asset-uploader/server";
import * as db from "./index";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz");

export type Project = Omit<BaseProject, "assets"> & {
  assets?: Array<Asset>;
};

const parseProject = (project: BaseProject): Project => {
  return {
    ...project,
    assets: project?.assets?.map(formatAsset),
  };
};

export const loadById = async (projectId?: Project["id"]) => {
  if (typeof projectId !== "string") {
    throw new Error("Project ID required");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      assets: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!project) return null;
  return parseProject(project);
};

export const loadByDomain = async (domain: string): Promise<Project | null> => {
  const project = await prisma.project.findUnique({
    where: { domain: domain.toLowerCase() },
    include: {
      assets: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
  if (!project) return null;

  return parseProject(project);
};

export const loadManyByUserId = async (
  userId: User["id"]
): Promise<Array<Project>> => {
  const projects = await prisma.project.findMany({
    where: {
      user: {
        id: userId,
      },
    },
  });

  return projects.map(parseProject) as Project[];
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

  return parseProject(project);
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

  return parseProject(project);
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
