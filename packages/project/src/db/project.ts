import { prisma, Prisma } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import { createBuild } from "@webstudio-is/project-build/index.server";
import { MarketplaceApprovalStatus, Project, Title } from "../shared/schema";
import { generateDomain, validateProjectDomain } from "./project-domain";
import { nanoid } from "nanoid";

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
    include: {
      latestBuild: true,
      latestStaticBuild: true,
      previewImageAsset: true,
    },
  });

  if (data === null) {
    throw new Error(`Project ${projectId} not found`);
  }

  return Project.parse(data);
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

  const projectId = crypto.randomUUID();

  // create project without user first
  // and set user only after build is successfully created
  // this way to make project creation transactional
  // for user
  const newProject = await context.postgrest.client.from("Project").insert({
    id: projectId,
    title,
    domain: generateDomain(title),
  });
  if (newProject.error) {
    throw newProject.error;
  }

  await createBuild({ projectId }, context);

  const updatedProject = await context.postgrest.client
    .from("Project")
    .update({ userId })
    .eq("id", projectId)
    .select("*")
    .single();
  if (updatedProject.error) {
    throw updatedProject.error;
  }
  return updatedProject.data;
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

  return await context.postgrest.client
    .from("Project")
    .update({
      isDeleted: true,
      // Free up the subdomain
      domain: nanoid(),
    })
    .eq("id", projectId);
};

const assertEditPermission = async (projectId: string, context: AppContext) => {
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );

  if (canEdit === false) {
    throw new Error(
      "Only a token or user with edit permission can edit the project."
    );
  }
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

  await assertEditPermission(projectId, context);

  return await prisma.project.update({
    where: { id: projectId },
    data: { title },
  });
};

export const updatePreviewImage = async (
  {
    projectId,
    assetId,
  }: {
    projectId: Project["id"];
    assetId: string | null;
  },
  context: AppContext
) => {
  await assertEditPermission(projectId, context);

  return await prisma.project.update({
    where: { id: projectId },
    data: { previewImageAssetId: assetId },
  });
};

export const clone = async (
  {
    projectId,
    title,
  }: {
    projectId: string;
    title?: string | undefined;
  },
  context: AppContext
) => {
  const project = await loadById(projectId, context);
  if (project === null) {
    throw new Error(`Not found project "${projectId}"`);
  }

  const { userId } = context.authorization;
  if (userId === undefined) {
    throw new Error("The user must be authenticated to clone the project");
  }

  const clonedProject = await context.postgrest.client.rpc("clone_project", {
    project_id: projectId,
    user_id: userId,
    title: title ?? `${project.title} (copy)`,
    domain: generateDomain(project.title),
  });
  if (clonedProject.error) {
    throw clonedProject.error;
  }

  return { id: clonedProject.data.id };
};

export const updateDomain = async (
  input: {
    id: string;
    domain: string;
  },
  context: AppContext
) => {
  const domainValidation = validateProjectDomain(input.domain);

  if (domainValidation.success === false) {
    throw new Error(domainValidation.error);
  }

  const { domain } = domainValidation;

  await assertEditPermission(input.id, context);

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

export const setMarketplaceApprovalStatus = async (
  {
    projectId,
    marketplaceApprovalStatus,
  }: {
    projectId: Project["id"];
    marketplaceApprovalStatus: MarketplaceApprovalStatus;
  },
  context: AppContext
) => {
  if (
    marketplaceApprovalStatus === "APPROVED" ||
    marketplaceApprovalStatus === "REJECTED"
  ) {
    throw new Error("User can't approve or reject");
  }
  await assertEditPermission(projectId, context);

  return await prisma.project.update({
    where: { id: projectId },
    data: { marketplaceApprovalStatus },
  });
};
