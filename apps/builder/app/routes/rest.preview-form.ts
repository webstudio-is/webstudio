import { parseJsonExpression } from "@webstudio-is/expression";
import { capturePreviewFormExchange } from "~/services/preview-form-inspection.server";
import type { PreviewFormExchange } from "~/shared/preview-form-inspection";
import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
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
  getFormEmailStringifyOptions,
  defaultEmailBody,
  defaultEmailConfirmationSubject,
  defaultEmailSubject,
} from "@webstudio-is/sdk";
import { createManagedFormDraftGraph } from "@webstudio-is/sdk/managed-form-draft-graph";
import {
  cloudflareManagedFormPreviewEmailServiceUrl,
  createCloudflareManagedFormEmailSenderWithUrl,
  getManagedFormFailure,
  getSystemSearch,
  handleManagedFormSubmission,
  readFormDataWithLimit,
  getManagedFormBrowserInfo,
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
  json(body, {
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
    // This request comes from the Builder, whose URL can contain a build-access
    // token. Keep only the sanitized origin/path from Referer; never forward its
    // query string into Form bindings or email content.
    const formHeaders = new Headers(request.headers);
    formHeaders.delete("referer");
    const safeReferrer = getManagedFormBrowserInfo(request).referrer;
    if (safeReferrer) {
      formHeaders.set("referer", safeReferrer);
    }
    const formRequest = new Request(request, { headers: formHeaders });
    const formData = await readFormDataWithLimit(formRequest);
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
    const actionProp = build.props.find(
      (prop) => prop.instanceId === formId && prop.name === "action"
    );
    const action = actionProp?.type === "json" ? actionProp.value : undefined;
    const destinations = isFormSubmission(action)
      ? getEnabledFormDestinations(action)
      : [];
    const resourceIds = destinations.map((id) => {
      const source = dataSources.get(id);
      return source?.type === "resource" && resources.has(source.resourceId)
        ? source.resourceId
        : null;
    });
    const resourceNames = new Map(
      destinations.flatMap((id) => {
        const source = dataSources.get(id);
        return source?.type === "resource" && resources.has(source.resourceId)
          ? [[source.resourceId, source.name] as const]
          : [];
      })
    );
    const owner =
      project.userId === null
        ? undefined
        : await getUserById(context, project.userId);
    const ownerEmail = owner?.email ?? undefined;
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
    const exchanges: PreviewFormExchange[] = [];
    let previewBrowserInfo: Record<string, unknown> | undefined;
    const privacy = getFormEmailStringifyOptions(instances, props, formId);
    const sensitiveFields = new Set(privacy.excludeKeys ?? []);
    const privateValues = new Set<string>([
      env.TRPC_SERVER_API_TOKEN ?? "",
      request.url,
    ]);
    const publicValues = new Set<string>();
    const sensitiveName =
      /authorization|cookie|token|api[-_]?key|secret|password|session|csrf|credential/i;
    const collect = (value: unknown, target: Set<string>) => {
      if (value !== null && typeof value === "object") {
        for (const [name, entry] of Object.entries(value)) {
          collect(entry, sensitiveName.test(name) ? privateValues : target);
        }
      } else if (value !== undefined) {
        target.add(String(value));
      }
    };
    for (const [name, value] of formData) {
      if (typeof value === "string") {
        (sensitiveName.test(name) || sensitiveFields.has(name)
          ? privateValues
          : publicValues
        ).add(value);
      }
    }
    for (const [name, value] of request.headers) {
      if (sensitiveName.test(name)) {
        privateValues.add(value);
      }
    }
    for (const source of dataSources.values()) {
      if (source.type === "variable" && sensitiveName.test(source.name)) {
        collect(source.value.value, privateValues);
      }
    }
    for (const resource of resources.values()) {
      collect(parseJsonExpression(resource.body), publicValues);
      if (resource.control === "email") {
        collect(parseJsonExpression(resource.email?.subject), publicValues);
        collect(parseJsonExpression(resource.email?.body), publicValues);
      }
    }
    for (const value of [
      projectMeta?.emailSubject,
      projectMeta?.emailBody,
      projectMeta?.emailConfirmationSubject,
      defaultEmailSubject,
      defaultEmailBody,
      defaultEmailConfirmationSubject,
    ]) {
      collect(value, publicValues);
    }
    const result = await handleManagedFormSubmission({
      request: formRequest,
      formData,
      url: pageUrl,
      system,
      configuration: (id) =>
        id === formId ? { action, resourceIds } : undefined,
      getGraph: (id, values) => {
        previewBrowserInfo = values.browserInfo as Record<string, unknown>;
        return createManagedFormDraftGraph({
          formId: id,
          destinationDataSourceIds: destinations,
          instances,
          props,
          dataSources,
          resources,
          projectMeta,
          ownerEmail,
          ownerName: owner?.username ?? undefined,
          system: values.system,
          systemDataSourceId: match.value.systemDataSourceId,
          formData: values.formData as Record<string, unknown>,
          browserInfo: values.browserInfo as Record<string, unknown>,
          evaluateExpression,
        });
      },
      trustedIp: request.headers.get("cf-connecting-ip") ?? undefined,
      createEmailSender: (data) =>
        createCloudflareManagedFormEmailSenderWithUrl(
          cloudflareManagedFormPreviewEmailServiceUrl,
          env.TRPC_SERVER_API_TOKEN,
          data,
          projectId
        ),
      validateEmail: validateCloudflareManagedFormEmail,
      resourceFetch,
      onResourceExchange: async (resourceId, exchange) => {
        if (!resourceIds.includes(resourceId) || exchanges.length >= 100) {
          return;
        }
        exchanges.push(
          await capturePreviewFormExchange(resourceId, exchange, {
            publicValues,
            privateValues,
            resourceName: resourceNames.get(resourceId) ?? resourceId,
            sensitiveFields,
            redactAllBody: privacy.stringifyAs !== undefined,
            allowRequestBody: exchange.kind === "email",
          })
        );
      },
      validateDestination: resourceFetch.validateDestination,
    });
    return respond({
      ...result,
      previewExchanges: exchanges,
      previewBrowserInfo,
    } as ManagedFormResponse);
  } catch (error) {
    return respond(
      getManagedFormFailure(
        error instanceof Error ? error.message : "Form submission failed"
      )
    );
  }
};
