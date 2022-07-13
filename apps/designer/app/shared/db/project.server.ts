import slugify from "slugify";
import { nanoid } from "nanoid";
import type { Project as BaseProject, User } from "@webstudio-is/sdk";
import { z } from "zod";
import { prisma, Prisma } from "./prisma.server";
import * as db from ".";

const TreeHistorySchema = z.array(z.string());

export type Project = Omit<BaseProject, "prodTreeIdHistory"> & {
  prodTreeIdHistory: z.infer<typeof TreeHistorySchema>;
};

const parseProject = (project: BaseProject | null): Project | null => {
  if (project === null) return null;
  const prodTreeIdHistory = JSON.parse(project.prodTreeIdHistory);
  TreeHistorySchema.parse(prodTreeIdHistory);
  return {
    ...project,
    prodTreeIdHistory,
  };
};

export const loadById = async (
  projectId?: Project["id"]
): Promise<Project | null> => {
  if (typeof projectId !== "string") {
    throw new Error("Project ID required");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  return parseProject(project);
};

export const loadByDomain = async (domain: string): Promise<Project | null> => {
  const project = await prisma.project.findUnique({ where: { domain } });

  return parseProject(project);
};

export const loadManyByUserId = async (
  userId: User["id"]
): Promise<Array<Project>> => {
  const projects = await prisma.project.findMany({
    where: {
      User: {
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
}): Promise<Project | null> => {
  if (title.length < MIN_TITLE_LENGTH) {
    throw new Error(`Minimum ${MIN_TITLE_LENGTH} characters required`);
  }

  const domain = generateDomain(title);
  const breakpoints = db.breakpoints.getBreakpointsWithId();
  const tree = await db.tree.create(db.tree.createRootInstance(breakpoints));
  const project = await prisma.project.create({
    data: {
      userId,
      title,
      domain,
      devTreeId: tree.id,
    },
  });

  await db.breakpoints.create(tree.id, breakpoints);
  return parseProject(project);
};

export const clone = async (
  clonableDomain: string,
  userId: string
): Promise<Project> => {
  const clonableProject = await loadByDomain(clonableDomain);
  if (clonableProject === null) {
    throw new Error(`Not found project "${clonableDomain}"`);
  }
  if (clonableProject.prodTreeId === null) {
    throw new Error("Expected project to be published first");
  }

  const tree = await db.tree.clone(clonableProject.prodTreeId);
  const domain = generateDomain(clonableProject.title);
  const [project] = await Promise.all([
    prisma.project.create({
      data: {
        userId: userId,
        title: clonableProject.title,
        domain,
        devTreeId: tree.id,
      },
    }),
    db.props.clone({
      previousTreeId: clonableProject.prodTreeId,
      nextTreeId: tree.id,
    }),
    db.breakpoints.clone({
      previousTreeId: clonableProject.prodTreeId,
      nextTreeId: tree.id,
    }),
  ]);

  const parsedProject = parseProject(project);
  if (parsedProject === null) {
    throw new Error(`Not found project "${clonableDomain}"`);
  }
  return parsedProject;
};

export const update = async ({
  id,
  ...data
}: {
  id: string;
  domain?: string;
  prodTreeId?: string;
  devTreeId?: string;
  prodTreeIdHistory: Array<string>;
}): Promise<BaseProject> => {
  if (data.domain) {
    data.domain = slugify(data.domain, slugifyOptions);
    if (data.domain.length < MIN_DOMAIN_LENGTH) {
      throw new Error(`Minimum ${MIN_DOMAIN_LENGTH} characters required`);
    }
  }

  TreeHistorySchema.parse(data.prodTreeIdHistory);

  try {
    const project = await prisma.project.update({
      data: {
        ...data,
        prodTreeIdHistory: JSON.stringify(data.prodTreeIdHistory),
      },
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
