import slugify from "slugify";
import { nanoid } from "nanoid";
import {
  User,
  prisma,
  Prisma,
  Project as BaseProject,
} from "@webstudio-is/prisma-client";
import * as db from ".";
import { formatAsset } from "@webstudio-is/asset-uploader";
import type { Asset } from "@webstudio-is/asset-uploader";

export type Project = Omit<BaseProject, "assets" | "devBuild"> & {
  assets?: Array<Asset>;
  devBuild?: db.build.Build;
};

const parseProject = (project: BaseProject): Project => {
  return {
    ...project,
    assets: project?.assets?.map(formatAsset),
    devBuild: project?.devBuild && db.build.parseBuild(project.devBuild),
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
      devBuild: true,
    },
  });

  if (!project) return null;
  return parseProject(project);
};

export const loadByDomain = async (domain: string): Promise<Project | null> => {
  const project = await prisma.project.findUnique({
    where: { domain },
    include: {
      assets: {
        orderBy: {
          createdAt: "desc",
        },
      },
      devBuild: true,
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
  devBuildId,
}: {
  userId: string;
  title: string;
  devBuildId?: db.build.Build["id"];
}) => {
  if (title.length < MIN_TITLE_LENGTH) {
    throw new Error(`Minimum ${MIN_TITLE_LENGTH} characters required`);
  }

  const project = await prisma.project.create({
    data: {
      userId,
      title,
      domain: generateDomain(title),
      devBuildId: devBuildId ?? (await db.build.createDev()).id,
    },
  });

  return parseProject(project);
};

export const clone = async (clonableDomain: string, userId: string) => {
  const clonableProject = await loadByDomain(clonableDomain);
  if (clonableProject === null) {
    throw new Error(`Not found project "${clonableDomain}"`);
  }

  const prodBuild = await db.build.loadProdByProjectId(clonableProject.id);

  if (prodBuild === undefined) {
    throw new Error("Expected project to be published first");
  }

  const devBuild = await db.build.createDev(prodBuild);

  return create({
    userId: userId,
    title: clonableProject.title,
    devBuildId: devBuild.id,
  });
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
