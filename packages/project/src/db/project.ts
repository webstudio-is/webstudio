import { nanoid } from "nanoid";
import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import { createBuild } from "@webstudio-is/project-build/index.server";
import { MarketplaceApprovalStatus, Project, Title } from "../shared/schema";
import { generateDomain, validateProjectDomain } from "./project-domain";
import type { SetNonNullable } from "type-fest";

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

  const data = await context.postgrest.client
    .from("Project")
    .select(
      `
        *,
        previewImageAsset:Asset (*),
        latestBuild:LatestBuildPerProject (*),
        latestStaticBuild:LatestStaticBuildPerProject (*)
      `
    )
    .eq("id", projectId)
    .eq("isDeleted", false)
    .single();
  if (data.error) {
    throw data.error;
  }
  const { latestBuild, latestStaticBuild, ...project } = data.data;

  return {
    ...project,
    // postgres marks all view fields as nullable
    // workaround this by casting to non nullable
    latestBuild: (latestBuild[0] ?? null) as null | SetNonNullable<
      NonNullable<(typeof latestBuild)[0]>
    >,
    latestStaticBuild: (latestStaticBuild[0] ?? null) as null | SetNonNullable<
      NonNullable<(typeof latestStaticBuild)[0]>
    >,
  } satisfies Project;
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

  const deletedProject = await context.postgrest.client
    .from("Project")
    .update({
      isDeleted: true,
      // Free up the subdomain
      domain: nanoid(),
    })
    .eq("id", projectId);
  if (deletedProject.error) {
    throw deletedProject.error;
  }
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

  const renamedProject = await context.postgrest.client
    .from("Project")
    .update({ title })
    .eq("id", projectId);
  if (renamedProject.error) {
    throw renamedProject.error;
  }
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

  const updatedProject = await context.postgrest.client
    .from("Project")
    .update({ previewImageAssetId: assetId })
    .eq("id", projectId);
  if (updatedProject.error) {
    throw updatedProject.error;
  }
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

  const updatedProject = await context.postgrest.client
    .from("Project")
    .update({ domain })
    .eq("id", input.id);
  if (updatedProject.error) {
    if (updatedProject.error.code === "23505") {
      throw new Error(`Domain "${domain}" is already used`);
    }
    throw updatedProject.error;
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

  const updatedProject = await context.postgrest.client
    .from("Project")
    .update({ marketplaceApprovalStatus })
    .eq("id", projectId)
    .select()
    .single();
  if (updatedProject.error) {
    throw updatedProject.error;
  }
  return updatedProject.data;
};
