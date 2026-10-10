import { z } from "zod";
import { nanoid } from "nanoid";
import {
  dataSource,
  resource,
  decodeDataVariableId,
  encodeDataVariableId,
  getResourceDataSourceIds,
  type DataSource,
  type Resource,
} from "@webstudio-is/sdk";
import {
  getExpressionIdentifiers,
  transpileExpression,
} from "@webstudio-is/expression";
import { mapResourceExpressionsMutable } from "@webstudio-is/project-build/runtime";

const namespace = "@webstudio/variable/v0.1";
const payload = z.object({
  variable: dataSource,
  resource: resource.optional(),
  references: z.array(z.object({ id: z.string(), name: z.string() })),
});

export const serializeVariable = (
  variable: DataSource,
  resources: ReadonlyMap<string, Resource>,
  dataSources: ReadonlyMap<string, DataSource>
) => {
  if (variable.type === "parameter") {
    throw Error("Context parameters cannot be copied");
  }
  const resource =
    variable.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;
  if (variable.type === "resource" && resource === undefined) {
    throw Error("Resource configuration is missing");
  }
  const ids = new Map([[variable.id, "variable"]]);
  const references = [...(resource ? getResourceDataSourceIds(resource) : [])]
    .filter((id) => id !== variable.id)
    .map((id, index) => {
      const key = `reference${index}`;
      ids.set(id, key);
      return { id: key, name: dataSources.get(id)?.name ?? "" };
    });
  const remap = (expression: string) =>
    expression.trim() === ""
      ? expression
      : transpileExpression({
          expression,
          replaceVariable: (identifier) => {
            const sourceId = decodeDataVariableId(identifier);
            const key = sourceId && ids.get(sourceId);
            return key ? encodeDataVariableId(key) : undefined;
          },
        });
  const copiedResource = resource && {
    ...resource,
    id: "resource",
    headers: resource.headers.map((header) => ({ ...header })),
    searchParams: resource.searchParams?.map((param) => ({ ...param })),
    email: resource.email && { ...resource.email },
  };
  if (copiedResource) {
    mapResourceExpressionsMutable(copiedResource, remap);
  }
  const copiedVariable = {
    ...variable,
    id: "variable",
    scopeInstanceId: undefined,
    ...(variable.type === "resource" && { resourceId: "resource" }),
  };
  return JSON.stringify({
    [namespace]: {
      variable: copiedVariable,
      resource: copiedResource,
      references,
    },
  });
};

/** Resolve references before mutating stores so a failed paste is atomic. */
export const deserializeVariable = (
  text: string,
  scopeInstanceId: string,
  available: ReadonlyMap<string, DataSource>
) => {
  const parsed = z.object({ [namespace]: payload }).parse(JSON.parse(text))[
    namespace
  ];
  if (parsed.variable.type === "parameter") {
    throw Error("Context parameters cannot be pasted");
  }
  const id = nanoid();
  const remappedIds = new Map([[parsed.variable.id, id]]);
  const unresolved: string[] = [];
  // Verify every actual reference, even if the clipboard omitted its metadata.
  for (const referenceId of parsed.resource
    ? getResourceDataSourceIds(parsed.resource)
    : []) {
    if (remappedIds.has(referenceId)) {
      continue;
    }
    const reference = parsed.references.find(({ id }) => id === referenceId);
    const target = [...available.values()].find(
      ({ name }) => name === reference?.name
    );
    if (target) {
      remappedIds.set(referenceId, target.id);
    } else {
      unresolved.push(reference?.name ?? referenceId);
    }
  }
  const remappedNames = new Map<string, string>();
  if (parsed.resource) {
    mapResourceExpressionsMutable(parsed.resource, (expression) => {
      for (const identifier of getExpressionIdentifiers(expression)) {
        if (
          decodeDataVariableId(identifier) !== undefined ||
          ["undefined", "NaN", "Infinity"].includes(identifier)
        ) {
          continue;
        }
        const target = [...available.values()].find(
          ({ name }) => name === identifier
        );
        if (target) {
          remappedNames.set(identifier, encodeDataVariableId(target.id));
        } else if (!unresolved.includes(identifier)) {
          unresolved.push(identifier);
        }
      }
    });
  }
  if (unresolved.length) {
    throw Error(
      `Unable to paste: unresolved variables: ${unresolved.join(", ")}`
    );
  }
  const remap = (expression: string) =>
    expression.trim() === ""
      ? expression
      : transpileExpression({
          expression,
          replaceVariable: (identifier) => {
            const referenceId = decodeDataVariableId(identifier);
            const targetId = referenceId && remappedIds.get(referenceId);
            return targetId
              ? encodeDataVariableId(targetId)
              : remappedNames.get(identifier);
          },
        });
  let copiedResource: Resource | undefined;
  if (parsed.variable.type === "resource") {
    if (!parsed.resource) {
      throw Error("Resource configuration is missing");
    }
    copiedResource = parsed.resource;
    copiedResource.id = nanoid();
    mapResourceExpressionsMutable(copiedResource, remap);
  }
  const variable: DataSource = {
    ...parsed.variable,
    id,
    scopeInstanceId,
    ...(copiedResource && { resourceId: copiedResource.id }),
  };
  return { variable, resource: copiedResource };
};
