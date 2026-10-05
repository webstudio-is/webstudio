import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/server";
import { evaluateExpressionSync } from "@webstudio-is/project-build/runtime";
import * as projectApi from "@webstudio-is/project/index.server";
import {
  findTreeInstanceIds,
  decodeDataVariableId,
  getEnabledFormDestinations,
  isFormSubmission,
  getAllPages,
  getPagePath,
} from "@webstudio-is/sdk";
import { createManagedFormDraftGraph } from "@webstudio-is/sdk/managed-form-draft-graph";
import {
  createCloudflareManagedFormEmailSender,
  getManagedFormFailure,
  getSystemSearch,
  handleManagedFormSubmission,
  readFormDataWithLimit,
  validateCloudflareManagedFormEmail,
  type ManagedFormResponse,
} from "@webstudio-is/sdk/runtime";
import { managedFormIdFieldName } from "@webstudio-is/sdk/form-fields";
import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";
import { getDeniedResourceHostnames } from "@webstudio-is/sdk/protected-resource-fetch";
import { matchPathnameRoutes } from "@webstudio-is/wsauth";
import { toWebstudioParams } from "@webstudio-is/react-sdk";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { createContext } from "~/shared/context.server";
import { getUserById } from "~/shared/db/user.server";
import env from "~/env/env.server";

const respond = (body: ManagedFormResponse) =>
  Response.json(body, {
    status: body.status,
    headers: privateNoStoreResponseHeaders,
  });

/** Builder Preview evaluates the current draft after checking project build access. */
export const action = async ({ request }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);
  await checkCsrf(request);
  const { projectId } = parseBuilderUrl(request.url);
  if (projectId === undefined) {
    throw new Response("Project ID is not defined", { status: 404 });
  }
  const context = await createContext(request);
  if (
    context.authorization.type !== "user" &&
    context.authorization.type !== "token"
  ) {
    throw new Response("Authentication required", { status: 401 });
  }
  if (
    !(await authorizeProject.hasProjectPermit(
      { projectId, permit: "build" },
      context
    ))
  ) {
    throw new Response("You don't have access to build this project", {
      status: 403,
    });
  }

  try {
    const formData = await readFormDataWithLimit(request);
    const ids = formData.getAll(managedFormIdFieldName);
    if (ids.length !== 1 || typeof ids[0] !== "string") {
      throw new Error("Invalid Form submission");
    }
    const formId = ids[0];
    const [project, build] = await Promise.all([
      projectApi.loadById(projectId, context),
      loadDevBuildByProjectId(context, projectId),
    ]);
    if (project === null || build === undefined) {
      throw new Error("Project draft not found");
    }
    const path = new URL(request.url).searchParams.get("path");
    if (
      path === null ||
      !path.startsWith("/") ||
      path.startsWith("//") ||
      path.includes("\\")
    ) {
      throw new Error("Invalid page path");
    }
    const pageUrl = new URL(
      path,
      `https://${project.domain}.${env.PUBLISHER_HOST}`
    );
    const match = matchPathnameRoutes(
      getAllPages(build.pages).map((page) => ({
        pattern: getPagePath(page.id, build.pages),
        value: page,
      })),
      pageUrl.pathname
    );
    const instances = new Map(
      build.instances.map((instance) => [instance.id, instance])
    );
    if (
      match === undefined ||
      !findTreeInstanceIds(instances, match.value.rootInstanceId).has(formId)
    ) {
      throw new Error("Form not found on this page");
    }
    const system = {
      params: toWebstudioParams(
        getPagePath(match.value.id, build.pages),
        match.params
      ),
      ...getSystemSearch(pageUrl.searchParams),
      origin: pageUrl.origin,
      pathname: pageUrl.pathname,
    };
    const props = new Map(build.props.map((prop) => [prop.id, prop]));
    const dataSources = new Map(
      build.dataSources.map((source) => [source.id, source])
    );
    const resources = new Map(
      build.resources.map((resource) => [resource.id, resource])
    );
    const submissionProp = build.props.find(
      (prop) => prop.instanceId === formId && prop.name === "submission"
    );
    const submission =
      submissionProp?.type === "json" ? submissionProp.value : undefined;
    const destinations = isFormSubmission(submission)
      ? getEnabledFormDestinations(submission)
      : [];
    const resourceIds = destinations.map((id) => {
      const source = dataSources.get(id);
      return source?.type === "resource" && resources.has(source.resourceId)
        ? source.resourceId
        : null;
    });
    const ownerEmail =
      project.userId === null
        ? undefined
        : ((await getUserById(context, project.userId)).email ?? undefined);
    const projectMeta = build.projectSettings?.meta ?? build.pages.meta;
    const resourceFetch = createNodeProtectedResourceFetch({
      deniedHostnames: getDeniedResourceHostnames([
        pageUrl.hostname,
        project.domain,
      ]),
    });
    const evaluateExpression = (
      expression: string,
      values: ReadonlyMap<string, unknown>
    ) =>
      evaluateExpressionSync(
        expression,
        new Map(
          Array.from(values, ([name, value]) => [
            decodeDataVariableId(name) ?? name,
            value,
          ])
        ),
        { throwOnError: true }
      );
    const emailService =
      env.FORM_PREVIEW_EMAIL_SERVICE_URL && env.FORM_PREVIEW_EMAIL_SERVICE_TOKEN
        ? {
            fetch: (_input: RequestInfo | URL, init?: RequestInit) => {
              const headers = new Headers(init?.headers);
              headers.set(
                "authorization",
                `Bearer ${env.FORM_PREVIEW_EMAIL_SERVICE_TOKEN}`
              );
              return fetch(env.FORM_PREVIEW_EMAIL_SERVICE_URL!, {
                ...init,
                headers,
              });
            },
          }
        : undefined;
    const result = await handleManagedFormSubmission({
      request,
      formData,
      url: pageUrl,
      system,
      configuration: (id) =>
        id === formId ? { submission, resourceIds } : undefined,
      getGraph: (id, values) =>
        createManagedFormDraftGraph({
          formId: id,
          destinationDataSourceIds: destinations,
          instances,
          props,
          dataSources,
          resources,
          projectMeta,
          ownerEmail,
          system: values.system,
          formData: values.formData as Record<string, unknown>,
          browserInfo: values.browserInfo as Record<string, unknown>,
          evaluateExpression,
        }),
      createEmailSender: (data) =>
        createCloudflareManagedFormEmailSender(emailService, data, projectId),
      validateEmail: validateCloudflareManagedFormEmail,
      resourceFetch,
      validateDestination: resourceFetch.validateDestination,
    });
    return respond(result);
  } catch (error) {
    return respond(
      getManagedFormFailure(
        error instanceof Error ? error.message : "Form submission failed"
      )
    );
  }
};
