import { expect, test } from "vitest";
import {
  encodeDataVariableId,
  type DataSource,
  type Resource,
} from "@webstudio-is/sdk";
import { serializeVariable, deserializeVariable } from "./variable-clipboard";

const variable: DataSource = {
  id: "source",
  type: "resource",
  name: "Request",
  scopeInstanceId: "old",
  resourceId: "request",
};
const dependency: DataSource = {
  id: "input",
  type: "variable",
  name: "Input",
  scopeInstanceId: "old",
  value: { type: "string", value: "hello" },
};
const resource: Resource = {
  id: "request",
  name: "request",
  method: "post",
  url: `${encodeDataVariableId("input")}.url`,
  headers: [{ name: "X-Test", value: encodeDataVariableId("source") }],
  body: encodeDataVariableId("input"),
  email: { subject: encodeDataVariableId("input") },
};
const serialize = () =>
  serializeVariable(
    variable,
    new Map([[resource.id, resource]]),
    new Map([[dependency.id, dependency]])
  );

test("resource clipboard regenerates ids and remaps dependency and self references", () => {
  const destination = { ...dependency, id: "destination" };
  const pasted = deserializeVariable(
    serialize(),
    "new",
    new Map([[destination.id, destination]])
  );
  expect(pasted.variable.id).not.toBe(variable.id);
  expect(pasted.variable.name).toBe("Request");
  expect(pasted.variable.scopeInstanceId).toBe("new");
  expect(pasted.resource?.id).not.toBe(resource.id);
  expect(pasted.resource?.url).toBe(
    `${encodeDataVariableId("destination")}.url`
  );
  expect(pasted.resource?.headers[0].value).toBe(
    encodeDataVariableId(pasted.variable.id)
  );
  expect(pasted.resource?.body).toBe(encodeDataVariableId("destination"));
  expect(pasted.resource?.email?.subject).toBe(
    encodeDataVariableId("destination")
  );
});

test("unresolved references are surfaced before pasting", () => {
  expect(() => deserializeVariable(serialize(), "new", new Map())).toThrow(
    "unresolved variables: Input"
  );
});

test("clipboard retains variable JSON configuration and rejects foreign versions", () => {
  const staticVariable: DataSource = {
    id: "json",
    name: "Config",
    type: "variable",
    value: { type: "json", value: { nested: [1, true] } },
  };
  const text = serializeVariable(staticVariable, new Map(), new Map());
  expect(deserializeVariable(text, "new", new Map()).variable).toMatchObject({
    name: "Config",
    value: staticVariable.value,
  });
  expect(() =>
    deserializeVariable(text.replace("v0.1", "v0.2"), "new", new Map())
  ).toThrow();
});

test("unbound expression references are reported and quoted names stay literal", () => {
  const unbound = {
    ...resource,
    url: "Missing.url",
    body: '"Missing"',
    headers: [],
    email: undefined,
  };
  const text = serializeVariable(
    variable,
    new Map([[resource.id, unbound]]),
    new Map()
  );
  expect(() => deserializeVariable(text, "new", new Map())).toThrow(
    "unresolved variables: Missing"
  );
});

test("clipboard uses local reference keys without original variable, Resource, or scope IDs", () => {
  const source = {
    ...variable,
    id: "original-variable-id",
    scopeInstanceId: "original-scope-id",
    resourceId: "original-resource-id",
  };
  const input = { ...dependency, id: "original-dependency-id" };
  const config = {
    ...resource,
    id: "original-resource-id",
    url: `${encodeDataVariableId(input.id)}.url`,
    body: encodeDataVariableId(source.id),
    headers: [],
    email: undefined,
  };
  const text = serializeVariable(
    source,
    new Map([[config.id, config]]),
    new Map([[input.id, input]])
  );
  for (const id of [
    source.id,
    source.scopeInstanceId,
    source.resourceId,
    input.id,
    encodeDataVariableId(source.id),
    encodeDataVariableId(input.id),
  ]) {
    expect(text).not.toContain(id);
  }
  const destination = { ...input, id: "new-dependency" };
  const pasted = deserializeVariable(
    text,
    "new-scope",
    new Map([[destination.id, destination]])
  );
  expect(pasted.resource?.url).toBe(
    `${encodeDataVariableId(destination.id)}.url`
  );
  expect(pasted.resource?.body).toBe(encodeDataVariableId(pasted.variable.id));
});
