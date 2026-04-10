import { nanoid } from "nanoid";
import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import { createBuild } from "@webstudio-is/project-build/index.server";
import { Title } from "../shared/project-schema";
import { MarketplaceApprovalStatus } from "../shared/marketplace-schema";
import { generateDomain, validateProjectDomain } from "./project-domain";
import type { SetNonNullable } from "type-fest";

export const findProjectIdsByUserId = async (
  userId: string,
  context: AppContext
) => {
  if (context.authorization.type !== "user") {
    throw new AuthorizationError(
      "Only logged in users can view the project list"
    );
  }

  if (userId !== context.authorization.userId) {
    throw new AuthorizationError(
      "Only the project owner can view the project list"
    );
  }

  const result = await context.postgrest.client
    .from("Project")
    .select("id")
    .eq("userId", userId)
    .eq("isDeleted", false)
    .order("id");

  if (result.error) {
    throw result.error;
  }

  return result.data;
};

export type Project = Awaited<ReturnType<typeof loadById>>;

export const loadById = async (projectId: string, context: AppContext) => {
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
        latestBuildVirtual(*),
        latestStaticBuild:LatestStaticBuildPerProject (*),
        domainsVirtual(*, latestBuildVirtual(*))
      `
    )
    .eq("id", projectId)
    .eq("isDeleted", false)
    .single();

  if (data.error) {
    throw data.error;
  }
  const { latestStaticBuild, ...project } = data.data;

  return {
    ...project,
    // postgres marks all view fields as nullable
    // workaround this by casting to non nullable
    latestStaticBuild: (latestStaticBuild[0] ?? null) as null | SetNonNullable<
      NonNullable<(typeof latestStaticBuild)[0]>
    >,
  };
};

export const create = async (
  { title, workspaceId }: { title: string; workspaceId?: string },
  context: AppContext
) => {
  Title.parse(title);

  if (context.authorization.type !== "user") {
    throw new AuthorizationError("Only logged in users can create a project");
  }

  const userId = context.authorization.userId;

  if (userId === undefined) {
    throw new Error("The user must be authenticated to create a project");
  }

  const projectId = crypto.randomUUID();

  // When creating inside a workspace, the project is owned by the workspace
  // owner — not the creating user. This ensures the workspace owner retains
  // full control and removing a member revokes all their access.
  let projectOwnerUserId = userId;

  if (workspaceId !== undefined) {
    const workspace = await context.postgrest.client
      .from("Workspace")
      .select("userId")
      .eq("id", workspaceId)
      .eq("isDeleted", false)
      .single();

    if (workspace.error) {
      throw workspace.error;
    }

    // Verify the caller is the workspace owner or a member
    if (workspace.data.userId !== userId) {
      const membership = await context.postgrest.client
        .from("WorkspaceMember")
        .select("userId, relation")
        .eq("workspaceId", workspaceId)
        .eq("userId", userId)
        .is("removedAt", null)
        .maybeSingle();

      if (membership.error) {
        throw membership.error;
      }

      if (membership.data === null) {
        throw new AuthorizationError("You don't have access to this workspace");
      }

      // Only builders and administrators can create projects
      const canCreate =
        membership.data.relation === "builders" ||
        membership.data.relation === "administrators";
      if (canCreate === false) {
        throw new AuthorizationError(
          "You don't have permission to create projects in this workspace"
        );
      }
    }

    projectOwnerUserId = workspace.data.userId;
  }

  // Enforce the per-user project limit before creating anything
  const ownerPlan = await context.getOwnerPlanFeatures(projectOwnerUserId);
  const projectCountResult = await context.postgrest.client
    .from("Project")
    .select("id", { count: "exact", head: true })
    .eq("userId", projectOwnerUserId)
    .eq("isDeleted", false);

  if (projectCountResult.error) {
    throw projectCountResult.error;
  }

  if ((projectCountResult.count ?? 0) >= ownerPlan.maxProjectsAllowedPerUser) {
    throw new Error(
      "You've reached the project limit for your plan. Upgrade or delete a project to create a new one."
    );
  }

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
    .update({ userId: projectOwnerUserId, workspaceId: workspaceId ?? null })
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

  await softDeleteProject(projectId, context);
};

/**
 * Soft-delete a single project: marks it as deleted and frees the subdomain
 * by assigning a unique random domain. Must be called once per project —
 * never in a bulk update — so every row gets its own unique domain.
 */
export const softDeleteProject = async (
  projectId: string,
  context: AppContext
) => {
  const result = await context.postgrest.client
    .from("Project")
    .update({
      isDeleted: true,
      // Free the subdomain — each project needs a unique value
      domain: nanoid(),
    })
    .eq("id", projectId);

  if (result.error) {
    throw result.error;
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
  destinationContext: AppContext,
  sourceContext: AppContext
) => {
  const project = await loadById(projectId, sourceContext);
  if (project === null) {
    throw new Error(`Not found project "${projectId}"`);
  }

  if (destinationContext.authorization.type !== "user") {
    throw new AuthorizationError("Only logged in users can clone a project");
  }

  const { userId } = destinationContext.authorization;
  if (userId === undefined) {
    throw new Error("The user must be authenticated to clone the project");
  }

  // Should be some mixed context in case of RLS
  // If the source project belongs to a workspace, check clone permissions
  // BEFORE creating the clone to avoid unnecessary rollbacks.
  let workspaceCloneTarget:
    | undefined
    | { workspaceId: string; projectOwnerUserId: string };

  if (project.workspaceId !== null) {
    const workspace = await destinationContext.postgrest.client
      .from("Workspace")
      .select("userId")
      .eq("id", project.workspaceId)
      .eq("isDeleted", false)
      .maybeSingle();

    if (workspace.error) {
      throw workspace.error;
    }

    if (workspace.data !== null) {
      const isOwner = workspace.data.userId === userId;

      if (isOwner) {
        workspaceCloneTarget = {
          workspaceId: project.workspaceId,
          projectOwnerUserId: workspace.data.userId,
        };
      } else {
        const membership = await destinationContext.postgrest.client
          .from("WorkspaceMember")
          .select("userId, relation")
          .eq("workspaceId", project.workspaceId)
          .eq("userId", userId)
          .is("removedAt", null)
          .maybeSingle();

        if (membership.error) {
          throw membership.error;
        }

        if (membership.data !== null) {
          const canClone =
            membership.data.relation === "builders" ||
            membership.data.relation === "administrators";

          if (canClone === false) {
            throw new AuthorizationError(
              "You don't have permission to clone projects in this workspace"
            );
          }

          // Place clone in workspace, owned by the workspace owner
          // (consistent with project creation)
          workspaceCloneTarget = {
            workspaceId: project.workspaceId,
            projectOwnerUserId: workspace.data.userId,
          };
        }
        // Non-members (e.g. token-based clone): clone stays in personal space
      }
    }
  }

  const clonedProject = await destinationContext.postgrest.client.rpc(
    "clone_project",
    {
      project_id: projectId,
      user_id: userId,
      title: title ?? `${project.title} (copy)`,
      domain: generateDomain(project.title),
    }
  );

  if (clonedProject.error) {
    throw clonedProject.error;
  }

  if (workspaceCloneTarget !== undefined) {
    const assignResult = await destinationContext.postgrest.client
      .from("Project")
      .update({
        workspaceId: workspaceCloneTarget.workspaceId,
        userId: workspaceCloneTarget.projectOwnerUserId,
      })
      .eq("id", clonedProject.data.id);

    if (assignResult.error) {
      throw assignResult.error;
    }
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

  // Check if the current wstd domain is published - forbid renaming while published
  // Get current domain first
  const currentProject = await context.postgrest.client
    .from("Project")
    .select("domain")
    .eq("id", input.id)
    .single();

  if (currentProject.error) {
    throw currentProject.error;
  }

  // Check if any build has this domain in deployment.domains
  const buildsWithDomain = await context.postgrest.client
    .from("Build")
    .select("id, deployment")
    .eq("projectId", input.id)
    .not("deployment", "is", null);

  if (buildsWithDomain.error) {
    throw buildsWithDomain.error;
  }

  const isDomainPublished = buildsWithDomain.data.some((build) => {
    const deployment = build.deployment as {
      destination?: string;
      domains?: string[];
    } | null;
    if (deployment === null) {
      return false;
    }
    if (deployment.destination === "static") {
      return false;
    }
    return deployment.domains?.includes(currentProject.data.domain) ?? false;
  });

  if (isDomainPublished) {
    throw new Error(
      "Cannot change domain while it is published. Unpublish first."
    );
  }

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

export const updateProjectTags = async (
  { projectId, tags }: { projectId: Project["id"]; tags: string[] },
  context: AppContext
) => {
  await assertEditPermission(projectId, context);
  const updatedProject = await context.postgrest.client
    .from("Project")
    .update({ tags })
    .eq("id", projectId)
    .select()
    .single();
  if (updatedProject.error) {
    throw updatedProject.error;
  }
  return updatedProject.data;
};
