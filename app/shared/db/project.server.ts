import slugify from "slugify";
import { nanoid } from "nanoid";
import { prisma, Prisma, type Project } from "./prisma.server";
import * as db from ".";

export const loadOne = async (id: string): Promise<Project | null> => {
  return await prisma.project.findUnique({
    where: { id },
  });
};

export const loadAll = async (): Promise<Array<Project>> => {
  return await prisma.project.findMany();
};

const slugifyOptions = { lower: true, strict: true };

const MIN_DOMAIN_LENGTH = 10;
const MIN_TITLE_LENGTH = 2;

export const create = async ({
  title,
}: {
  title: string | null;
}): Promise<Project> => {
  if (title === null || title.length < MIN_TITLE_LENGTH) {
    throw new Error(`Minimum ${MIN_TITLE_LENGTH} characters required`);
  }
  const slugifiedTitle = slugify(title, slugifyOptions);
  const domain = `${slugifiedTitle}-${nanoid(
    // If user entered a long title already, we just add 5 chars generated id
    // Otherwise we add the amount of chars to satisfy min length
    Math.max(MIN_DOMAIN_LENGTH - slugifiedTitle.length - 1, 5)
  )}`;

  const tree = await db.tree.create();

  return await prisma.project.create({
    data: {
      title,
      domain,
      devTreeId: tree.id,
    },
  });
};

export const update = async ({
  id,
  ...data
}: {
  id: string;
  domain?: string;
  prodTreeId?: string;
  devTreeId?: string;
  prodTreeIdHistory?: Array<string>;
}): Promise<Project> => {
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
