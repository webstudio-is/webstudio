import {
  decodeDataVariableId,
  encodeDataVariableId,
  findTreeInstanceIds,
  getExpressionIdentifiers,
  lintExpression,
  ROOT_INSTANCE_ID,
  SYSTEM_VARIABLE_ID,
  isLiteralExpression,
  type Instance,
  type Page,
} from "@webstudio-is/sdk";
import { z } from "zod";
import type { BuilderState } from "../state/builder-state";
import { throwBuilderRuntimeError } from "./errors";
import { findAvailableVariables, listResourceExpressions } from "./data";
import {
  findSerializedPageByInput,
  getSerializedPagePath,
  getSerializedPages,
  listPageMetadataExpressions,
} from "./pages";
import { listPropExpressions } from "./props";
import {
  paginateOutput,
  paginatedOutputInputSchema,
  paginatedOutputMetadataSchema,
} from "./output";

export const bindingVerificationContractVersion = 1 as const;

export const bindingVerificationInput = paginatedOutputInputSchema
  .extend({
    pageId: z
      .string()
      .optional()
      .describe("Verify only bindings on this page."),
    pagePath: z
      .string()
      .optional()
      .describe("Verify only bindings on the page matching this path."),
    instanceId: z
      .string()
      .optional()
      .describe("Verify only bindings in this instance subtree."),
  })
  .strict()
  .refine(
    ({ pageId, pagePath }) => pageId === undefined || pagePath === undefined,
    { message: "Use either pageId or pagePath, not both", path: ["pageId"] }
  );

export const bindingVerificationFindingCode = z.enum([
  "invalid-expression",
  "unknown-identifier",
  "stale-data-source-id",
  "out-of-scope-data-source",
  "missing-resource",
  "missing-parameter",
  "out-of-scope-parameter",
]);

export const bindingVerificationFinding = z.object({
  id: z.string(),
  code: bindingVerificationFindingCode,
  category: z.enum(["validity", "scope", "reference"]),
  severity: z.enum(["error", "warning"]),
  bindingKind: z.enum([
    "text-expression",
    "prop-expression",
    "prop-action",
    "prop-resource",
    "data-source-resource",
    "prop-parameter",
    "resource-expression",
    "page-metadata",
  ]),
  message: z.string(),
  remediation: z.string(),
  location: z.object({
    pageId: z.string().optional(),
    pagePath: z.string().optional(),
    instanceId: z.string().optional(),
    propId: z.string().optional(),
    propName: z.string().optional(),
    resourceId: z.string().optional(),
    dataSourceId: z.string().optional(),
    path: z.array(z.string()),
  }),
  range: z
    .object({
      from: z.number().int().nonnegative(),
      to: z.number().int().nonnegative(),
    })
    .optional(),
});

export const bindingVerificationResult = z.object({
  contractVersion: z.literal(bindingVerificationContractVersion),
  analysis: z.object({
    staticIntegrity: z.literal("complete"),
    renderedResolution: z.literal("not-evaluated"),
    externalResourcesExecuted: z.literal(false),
  }),
  summary: z.object({
    bindingsChecked: z.number().int().nonnegative(),
    findings: z.number().int().nonnegative(),
  }),
  findings: z.array(bindingVerificationFinding),
  ...paginatedOutputMetadataSchema.shape,
});

export type BindingVerificationInput = z.infer<typeof bindingVerificationInput>;
export type BindingVerificationFinding = z.infer<
  typeof bindingVerificationFinding
>;

type Location = BindingVerificationFinding["location"];
type BindingKind = BindingVerificationFinding["bindingKind"];

const getRequiredState = (state: BuilderState) => {
  if (
    state.pages === undefined ||
    state.instances === undefined ||
    state.props === undefined ||
    state.dataSources === undefined ||
    state.resources === undefined
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Binding verification requires pages, instances, props, data sources, and resources"
    );
  }
  return {
    pages: state.pages,
    instances: state.instances,
    props: state.props,
    dataSources: state.dataSources,
    resources: state.resources,
  };
};

const locationKey = (location: Location) =>
  [
    location.pageId,
    location.instanceId,
    location.propId,
    location.resourceId,
    location.dataSourceId,
    ...location.path,
  ]
    .filter((value) => value !== undefined)
    .join(":");

const createFinding = (
  code: BindingVerificationFinding["code"],
  bindingKind: BindingKind,
  location: Location,
  details: Pick<
    BindingVerificationFinding,
    "category" | "severity" | "message" | "remediation"
  > & { range?: BindingVerificationFinding["range"] }
): BindingVerificationFinding => ({
  id: `${code}:${bindingKind}:${locationKey(location)}${details.range === undefined ? "" : `:${details.range.from}:${details.range.to}`}`,
  code,
  bindingKind,
  location,
  ...details,
});

const shouldVerifyPageMetadataExpression = (
  expression: string,
  availableVariables: ReadonlySet<string>
) => {
  if (isLiteralExpression(expression)) {
    return false;
  }
  if (
    Array.from(getExpressionIdentifiers(expression)).some(
      (identifier) =>
        decodeDataVariableId(identifier) !== undefined ||
        availableVariables.has(identifier)
    )
  ) {
    return true;
  }
  // Page metadata accepts plain fixed strings, which are stored without JS
  // string delimiters. Verify computed syntax while leaving ordinary
  // imported/editor-authored text alone.
  return /\?\?|&&|\|\||===|!==|==|!=|<=|>=|\s[+*/%]\s|\s-\s/.test(expression);
};

export const verifyBindings = (
  state: BuilderState,
  input: BindingVerificationInput
) => {
  const { pages, instances, props, dataSources, resources } =
    getRequiredState(state);
  const serializedPages = getSerializedPages({ pages });
  const pagePathById = new Map(
    serializedPages.pages.map((page) => [
      page.id,
      getSerializedPagePath(serializedPages, page) || "/",
    ])
  );
  let selectedPage: Page | undefined;
  if (input.pageId !== undefined || input.pagePath !== undefined) {
    const serializedPage = findSerializedPageByInput(serializedPages, input);
    selectedPage =
      serializedPage === undefined
        ? undefined
        : pages.pages.get(serializedPage.id);
    if (selectedPage === undefined) {
      return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
    }
  }
  if (
    input.instanceId !== undefined &&
    instances.has(input.instanceId) === false
  ) {
    return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
  }

  let selectedInstanceIds: Set<string> | undefined;
  if (selectedPage !== undefined) {
    selectedInstanceIds = findTreeInstanceIds(
      instances,
      selectedPage.rootInstanceId
    );
  }
  if (input.instanceId !== undefined) {
    const subtreeIds = findTreeInstanceIds(instances, input.instanceId);
    selectedInstanceIds =
      selectedInstanceIds === undefined
        ? subtreeIds
        : new Set(
            [...subtreeIds].filter((instanceId) =>
              selectedInstanceIds?.has(instanceId)
            )
          );
    if (selectedInstanceIds.size === 0) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "The selected instance is not on the selected page"
      );
    }
  }

  const pageByInstanceId = new Map<string, Page>();
  for (const page of pages.pages.values()) {
    for (const instanceId of findTreeInstanceIds(
      instances,
      page.rootInstanceId
    )) {
      if (pageByInstanceId.has(instanceId) === false) {
        pageByInstanceId.set(instanceId, page);
      }
    }
  }
  const withPage = (instanceId: string, location: Location): Location => {
    const page = pageByInstanceId.get(instanceId);
    return page === undefined
      ? location
      : {
          pageId: page.id,
          pagePath: pagePathById.get(page.id) ?? "/",
          ...location,
        };
  };

  const findings: BindingVerificationFinding[] = [];
  let bindingsChecked = 0;
  const verifyExpression = ({
    expression,
    instanceId,
    bindingKind,
    location,
    allowAssignment = false,
    variables = [],
  }: {
    expression: string;
    instanceId: Instance["id"];
    bindingKind: BindingKind;
    location: Location;
    allowAssignment?: boolean;
    variables?: readonly string[];
  }) => {
    bindingsChecked += 1;
    const availableDataSources = findAvailableVariables({
      startingInstanceId: instanceId,
      instances,
      dataSources,
    });
    const availableIds = new Set(availableDataSources.map(({ id }) => id));
    const availableVariables = new Set(variables);
    for (const dataSource of availableDataSources) {
      availableVariables.add(dataSource.name);
      availableVariables.add(encodeDataVariableId(dataSource.id));
    }
    availableVariables.add("system");
    availableVariables.add(encodeDataVariableId(SYSTEM_VARIABLE_ID));
    // Encoded identifiers get dedicated reference/scope findings below.
    for (const identifier of getExpressionIdentifiers(expression)) {
      if (decodeDataVariableId(identifier) !== undefined) {
        availableVariables.add(identifier);
      }
    }

    const diagnostics = lintExpression({
      expression,
      availableVariables,
      allowAssignment,
    });
    for (const diagnostic of diagnostics) {
      const unknownMatch = diagnostic.message.match(
        /^"(.+)" is not defined in the scope$/
      );
      const code = unknownMatch ? "unknown-identifier" : "invalid-expression";
      findings.push(
        createFinding(code, bindingKind, location, {
          category: unknownMatch ? "scope" : "validity",
          severity: diagnostic.severity === "error" ? "error" : "warning",
          message: diagnostic.message,
          remediation: unknownMatch
            ? `Define ${JSON.stringify(unknownMatch[1])} in this instance scope or use an available variable, then rerun verify-bindings.`
            : "Correct the persisted expression using supported Webstudio expression syntax, then rerun verify-bindings.",
          range: { from: diagnostic.from, to: diagnostic.to },
        })
      );
    }
    for (const identifier of getExpressionIdentifiers(expression)) {
      const dataSourceId = decodeDataVariableId(identifier);
      if (dataSourceId === undefined || dataSourceId === SYSTEM_VARIABLE_ID) {
        continue;
      }
      const dataSource = dataSources.get(dataSourceId);
      if (dataSource === undefined) {
        findings.push(
          createFinding(
            "stale-data-source-id",
            bindingKind,
            { ...location, dataSourceId },
            {
              category: "reference",
              severity: "error",
              message: `Expression references missing data source ${JSON.stringify(dataSourceId)}.`,
              remediation:
                "Rebind this expression to a current in-scope variable; do not reuse the stale internal id.",
            }
          )
        );
      } else if (availableIds.has(dataSourceId) === false) {
        findings.push(
          createFinding(
            "out-of-scope-data-source",
            bindingKind,
            { ...location, dataSourceId },
            {
              category: "scope",
              severity: "error",
              message: `Expression references ${JSON.stringify(dataSource.name)} outside its instance scope.`,
              remediation:
                "Move the binding into the variable's scope or rebind it to a variable available at this instance.",
            }
          )
        );
      }
    }
  };

  const isSelectedInstance = (instanceId: string) =>
    selectedInstanceIds === undefined || selectedInstanceIds.has(instanceId);

  for (const instance of instances.values()) {
    if (isSelectedInstance(instance.id) === false) {
      continue;
    }
    for (const [childIndex, child] of instance.children.entries()) {
      if (child.type !== "expression") {
        continue;
      }
      verifyExpression({
        expression: child.value,
        instanceId: instance.id,
        bindingKind: "text-expression",
        location: withPage(instance.id, {
          instanceId: instance.id,
          path: [
            "instances",
            instance.id,
            "children",
            String(childIndex),
            "value",
          ],
        }),
      });
    }
  }

  const resourceScopes = new Map<string, Set<string>>();
  const addResourceScope = (resourceId: string, instanceId: string) => {
    const scopes = resourceScopes.get(resourceId) ?? new Set<string>();
    scopes.add(instanceId);
    resourceScopes.set(resourceId, scopes);
  };
  for (const prop of props.values()) {
    if (isSelectedInstance(prop.instanceId) === false) {
      continue;
    }
    const baseLocation = withPage(prop.instanceId, {
      instanceId: prop.instanceId,
      propId: prop.id,
      propName: prop.name,
      path: ["props", prop.id, "value"],
    });
    if (prop.type === "resource") {
      bindingsChecked += 1;
      addResourceScope(prop.value, prop.instanceId);
      if (resources.has(prop.value) === false) {
        findings.push(
          createFinding(
            "missing-resource",
            "prop-resource",
            { ...baseLocation, resourceId: prop.value },
            {
              category: "reference",
              severity: "error",
              message: `Prop ${JSON.stringify(prop.name)} references missing resource ${JSON.stringify(prop.value)}.`,
              remediation:
                "Bind the prop to an existing resource or remove the stale resource binding.",
            }
          )
        );
      }
      continue;
    }
    if (prop.type === "parameter") {
      bindingsChecked += 1;
      const parameter = dataSources.get(prop.value);
      const availableIds = new Set(
        findAvailableVariables({
          startingInstanceId: prop.instanceId,
          instances,
          dataSources,
        }).map(({ id }) => id)
      );
      if (parameter === undefined) {
        findings.push(
          createFinding(
            "missing-parameter",
            "prop-parameter",
            { ...baseLocation, dataSourceId: prop.value },
            {
              category: "reference",
              severity: "error",
              message: `Prop ${JSON.stringify(prop.name)} references missing parameter ${JSON.stringify(prop.value)}.`,
              remediation:
                "Rebind the prop to a current parameter available at this instance.",
            }
          )
        );
      } else if (
        parameter.scopeInstanceId !== prop.instanceId &&
        availableIds.has(parameter.id) === false
      ) {
        findings.push(
          createFinding(
            "out-of-scope-parameter",
            "prop-parameter",
            { ...baseLocation, dataSourceId: parameter.id },
            {
              category: "scope",
              severity: "error",
              message: `Prop ${JSON.stringify(prop.name)} references parameter ${JSON.stringify(parameter.name)} outside its instance scope.`,
              remediation:
                "Bind the prop to a parameter available at this instance or move it into the parameter's scope.",
            }
          )
        );
      }
      continue;
    }
    for (const entry of listPropExpressions(prop)) {
      verifyExpression({
        expression: entry.expression,
        instanceId: prop.instanceId,
        bindingKind: prop.type === "action" ? "prop-action" : "prop-expression",
        location: {
          ...baseLocation,
          path: [...baseLocation.path, ...entry.path],
        },
        allowAssignment: entry.allowAssignment,
        variables: entry.variables,
      });
    }
  }

  for (const dataSource of dataSources.values()) {
    if (dataSource.type !== "resource") {
      continue;
    }
    const scopeInstanceId = dataSource.scopeInstanceId ?? ROOT_INSTANCE_ID;
    if (
      scopeInstanceId !== ROOT_INSTANCE_ID &&
      isSelectedInstance(scopeInstanceId) === false
    ) {
      continue;
    }
    if (
      scopeInstanceId === ROOT_INSTANCE_ID &&
      selectedPage === undefined &&
      input.instanceId !== undefined
    ) {
      continue;
    }
    bindingsChecked += 1;
    addResourceScope(dataSource.resourceId, scopeInstanceId);
    if (resources.has(dataSource.resourceId) === false) {
      findings.push(
        createFinding(
          "missing-resource",
          "data-source-resource",
          {
            instanceId:
              scopeInstanceId === ROOT_INSTANCE_ID
                ? undefined
                : scopeInstanceId,
            resourceId: dataSource.resourceId,
            dataSourceId: dataSource.id,
            path: ["dataSources", dataSource.id, "resourceId"],
          },
          {
            category: "reference",
            severity: "error",
            message: `Data source ${JSON.stringify(dataSource.name)} references missing resource ${JSON.stringify(dataSource.resourceId)}.`,
            remediation:
              "Reconnect this data source to an existing resource or remove the stale data source.",
          }
        )
      );
    }
  }

  if (selectedInstanceIds === undefined && selectedPage === undefined) {
    for (const resourceId of resources.keys()) {
      if (resourceScopes.has(resourceId) === false) {
        addResourceScope(resourceId, ROOT_INSTANCE_ID);
      }
    }
  }
  for (const [resourceId, scopeInstanceIds] of resourceScopes) {
    const resource = resources.get(resourceId);
    if (resource === undefined) {
      continue;
    }
    for (const scopeInstanceId of scopeInstanceIds) {
      const expressionInstanceId =
        scopeInstanceId === ROOT_INSTANCE_ID
          ? (selectedPage?.rootInstanceId ?? ROOT_INSTANCE_ID)
          : scopeInstanceId;
      for (const entry of listResourceExpressions(resource)) {
        verifyExpression({
          expression: entry.expression,
          instanceId: expressionInstanceId,
          bindingKind: "resource-expression",
          location: withPage(expressionInstanceId, {
            instanceId:
              expressionInstanceId === ROOT_INSTANCE_ID
                ? undefined
                : expressionInstanceId,
            resourceId,
            path: ["resources", resourceId, ...entry.path],
          }),
        });
      }
    }
  }

  const metadataPages = selectedPage
    ? [selectedPage]
    : input.instanceId === undefined
      ? [...pages.pages.values()]
      : [];
  for (const page of metadataPages) {
    const availableVariables = new Set<string>(["system"]);
    for (const dataSource of findAvailableVariables({
      startingInstanceId: page.rootInstanceId,
      instances,
      dataSources,
    })) {
      availableVariables.add(dataSource.name);
      availableVariables.add(encodeDataVariableId(dataSource.id));
    }
    for (const entry of listPageMetadataExpressions(page)) {
      if (
        shouldVerifyPageMetadataExpression(
          entry.expression,
          availableVariables
        ) === false
      ) {
        continue;
      }
      verifyExpression({
        expression: entry.expression,
        instanceId: page.rootInstanceId,
        bindingKind: "page-metadata",
        location: {
          pageId: page.id,
          pagePath: pagePathById.get(page.id) ?? "/",
          instanceId: page.rootInstanceId,
          path: ["pages", page.id, ...entry.path],
        },
      });
    }
  }

  const sortedFindings = Array.from(
    new Map(findings.map((finding) => [finding.id, finding])).values()
  ).sort((left, right) => left.id.localeCompare(right.id));
  const { items, ...pagination } = paginateOutput({
    items: sortedFindings,
    cursor: input.cursor,
    limit: input.limit,
    verbose: input.verbose,
    filters: {
      pageId: selectedPage?.id,
      pagePath: input.pagePath,
      instanceId: input.instanceId,
    },
    invalidCursorMessage: "Invalid binding verification cursor",
  });
  return {
    contractVersion: bindingVerificationContractVersion,
    analysis: {
      staticIntegrity: "complete" as const,
      renderedResolution: "not-evaluated" as const,
      externalResourcesExecuted: false as const,
    },
    summary: { bindingsChecked, findings: sortedFindings.length },
    findings: items,
    ...pagination,
  };
};
