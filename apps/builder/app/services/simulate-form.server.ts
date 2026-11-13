import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { loadById } from "@webstudio-is/project/index.server";
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/server";
import {
  prepareManagedFormDraft,
  simulateManagedFormDraftSubmission,
} from "@webstudio-is/project-build/runtime";
import {
  createCloudflareManagedFormEmailSenderWithUrl,
  validateCloudflareManagedFormEmail,
} from "@webstudio-is/sdk/form/server";
import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";
import { getDeniedResourceHostnames } from "@webstudio-is/sdk/protected-resource-fetch";
import { getUserById } from "~/shared/db/user.server";
import env from "~/env/env.server";

/** Run the saved draft on the trusted Builder server, using Preview's Form engine. */
export const simulateFormSubmission = async ({
  context,
  projectId,
  formId,
  path,
  siteOrigin,
  values,
  arrayNames,
}: {
  context: AppContext;
  projectId: string;
  formId: string;
  path: string;
  siteOrigin?: string;
  values: readonly { name: string; value: string }[];
  arrayNames: readonly string[];
}) => {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.includes("#") ||
    Array.from(path).some((character) => character.charCodeAt(0) < 32) ||
    path.split("/").includes("..")
  ) {
    throw new Error("Form simulation requires a local page path");
  }
  const [project, build] = await Promise.all([
    loadById(projectId, context),
    loadDevBuildByProjectId(context, projectId),
  ]);
  if (project === null || build === undefined) {
    throw new Error("Project draft not found");
  }
  const origin = `https://${project.domain}.${env.PUBLISHER_HOST}`;
  if (siteOrigin !== undefined && new URL(siteOrigin).href !== `${origin}/`) {
    throw new Error("Form site origin does not match this project");
  }
  const pageUrl = new URL(path, origin);
  if (pageUrl.origin !== origin) {
    throw new Error("Form simulation requires a local page path");
  }
  const instances = new Map(
    build.instances.map((instance) => [instance.id, instance])
  );
  const props = new Map(build.props.map((prop) => [prop.id, prop]));
  const dataSources = new Map(
    build.dataSources.map((source) => [source.id, source])
  );
  const resources = new Map(
    build.resources.map((resource) => [resource.id, resource])
  );
  const owner =
    project.userId === null
      ? undefined
      : await getUserById(context, project.userId);
  const prepared = prepareManagedFormDraft({
    formId,
    pageUrl,
    pages: build.pages,
    instances,
    props,
    dataSources,
    resources,
    projectMeta: build.projectSettings?.meta ?? build.pages.meta,
    ownerEmail: owner?.email ?? undefined,
  });
  if (
    !env.TRPC_SERVER_API_TOKEN &&
    prepared.resourceIds.some(
      (id) => id !== null && resources.get(id)?.control === "email"
    )
  ) {
    return {
      success: false,
      status: 503,
      results: [],
      errors: [
        {
          status: 503,
          body: null,
          message: "Email service is unavailable for Form Preview",
        },
      ],
    };
  }
  const resourceFetch = createNodeProtectedResourceFetch({
    deniedHostnames: getDeniedResourceHostnames([
      pageUrl.hostname,
      project.domain,
    ]),
  });
  return await simulateManagedFormDraftSubmission({
    prepared,
    formId,
    pageUrl,
    values,
    arrayNames,
    resourceFetch,
    createEmailSender: (data) =>
      createCloudflareManagedFormEmailSenderWithUrl(
        env.EMAIL_SERVICE_URL,
        env.TRPC_SERVER_API_TOKEN,
        data,
        projectId
      ),
    validateEmail: validateCloudflareManagedFormEmail,
  });
};
