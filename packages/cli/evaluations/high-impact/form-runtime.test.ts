import { expect, test } from "vitest";
import { startFormRuntimeReceiver } from "./form-runtime-receiver";
import { managedFormRuntimeFixture } from "./fixtures";
import { createMinimalAgentTask, getFixtureToolNames } from "./agent-runner";
import { getMcpTraceRequest, getMcpTraceResponse } from "./mcp-trace-proxy";
import { evaluateHighImpactOutcome } from "./validate";

test("runtime fixture exposes server-side Form simulation without Preview tools", () => {
  const names = getFixtureToolNames(managedFormRuntimeFixture);
  expect(names).toContain("forms.simulate-submission");
  expect(names).not.toContain("preview.submit-form");
  expect(names).not.toContain("preview.start");
  expect(names).not.toContain("publish");
  expect(names).not.toContain("screenshot");
  const task = createMinimalAgentTask(managedFormRuntimeFixture, {
    kind: "source",
    repositoryRoot: "/fixture",
  });
  expect(task.constraints.join(" ")).toContain("synthetic values");
});

test("receiver records only destination and outcome", async () => {
  const receiver = await startFormRuntimeReceiver();
  try {
    const body = "private message body must never be recorded";
    const response = await fetch(`http://127.0.0.1:${receiver.port}/reject`, {
      method: "POST",
      body,
    });
    expect(response.status).toBe(503);
    expect(receiver.deliveries).toEqual([{ path: "/reject", status: 503 }]);
    expect(JSON.stringify(receiver.deliveries)).not.toContain(body);
  } finally {
    await receiver.close();
  }
});

test("MCP trace drops Form values, file bytes, and response bodies", () => {
  const request = getMcpTraceRequest({
    id: 7,
    method: "tools/call",
    params: {
      name: "forms.simulate-submission",
      arguments: {
        path: "/contact-runtime",
        siteOrigin: "https://site.example",
        selector: "form",
        values: [
          { name: "message", value: "private message body" },
          { name: "attachment", file: { base64: "c2VjcmV0" } },
        ],
      },
    },
  });
  expect(request?.call.arguments).toEqual({
    path: "/contact-runtime",
    siteOrigin: "https://site.example",
    hasFormFile: true,
  });
  const response = getMcpTraceResponse(
    {
      id: 7,
      result: {
        structuredContent: {
          data: {
            success: false,
            status: 502,
            errors: [{ message: "private server response" }],
          },
        },
      },
    },
    new Map([[7, request!.call]])
  );
  expect(response).toMatchObject({
    formStatus: "submitted",
    formState: "error",
  });
  expect(JSON.stringify(response)).not.toMatch(/private|c2VjcmV0/);
});

test("runtime validator rejects unobserved delivery", () => {
  const result = evaluateHighImpactOutcome({
    fixture: managedFormRuntimeFixture,
    project: managedFormRuntimeFixture.project,
    toolCalls: [{ name: "meta.guide" }],
    formRuntimeDeliveries: [],
  });
  expect(result.checks.runtimeObservedStates).toBe("failed");
  expect(result.checks.runtimeFormAction).toBe("failed");
});

test("runtime validator requires the observed success, failure, recovery sequence", () => {
  const project = structuredClone(managedFormRuntimeFixture.project);
  project.pages.push({
    id: "runtime-page",
    name: "Runtime",
    path: "/contact-runtime",
    rootInstanceId: "runtime-root",
  });
  project.instances.push({
    id: "runtime-root",
    component: "Body",
    children: [{ type: "id", value: "runtime-form" }],
  });
  project.instances.push({
    id: "runtime-form",
    component: "Form",
    children: ["name", "email", "subject", "message"].map((name) => ({
      type: "id" as const,
      value: `field-${name}`,
    })),
  });
  for (const name of ["name", "email", "subject", "message"]) {
    project.instances.push({
      id: `field-${name}`,
      component: name === "message" ? "Textarea" : "Input",
      children: [],
    });
    project.props.push({
      id: `prop-${name}`,
      instanceId: `field-${name}`,
      name: "name",
      type: "string",
      value: name,
    });
  }
  project.props.push({
    id: "action",
    instanceId: "runtime-form",
    name: "action",
    type: "json",
    value: [{ dataSourceId: "runtime-source" }],
  });
  project.dataSources.push({
    id: "runtime-source",
    resourceId: "runtime-resource",
  });
  project.resources.push({
    id: "runtime-resource",
    name: "Test receiver",
    method: "post",
    url: '"https://mcp-delivery.example/submit"',
    headers: [],
  });
  const submissions = (["success", "error", "success"] as const).map(
    (formState) => ({
      name: "forms.simulate-submission",
      arguments: {
        path: "/contact-runtime",
        siteOrigin: "https://site.example",
        formValueNames: ["name", "email", "subject", "message"],
      },
      formStatus: "submitted" as const,
      formState,
    })
  );
  const result = evaluateHighImpactOutcome({
    fixture: managedFormRuntimeFixture,
    project,
    toolCalls: [{ name: "meta.guide" }, ...submissions],
    formRuntimeDeliveries: [
      { path: "/submit", status: 200 },
      { path: "/reject", status: 503 },
      { path: "/reject", status: 503 },
      { path: "/submit", status: 200 },
    ],
  });
  expect(result.checks.runtimeFormFields).toBe("passed");
  expect(result.checks.runtimeFormAction).toBe("passed");
  expect(result.checks.runtimeObservedStates).toBe("passed");
  expect(result.checks.runtimeSessionPreview).toBe("passed");

  const withLegacyKey = structuredClone(project);
  withLegacyKey.props.find((prop) => prop.id === "action")!.value = [
    { dataSourceId: "runtime-source", enabled: false },
  ];
  expect(
    evaluateHighImpactOutcome({
      fixture: managedFormRuntimeFixture,
      project: withLegacyKey,
      toolCalls: [{ name: "meta.guide" }, ...submissions],
      formRuntimeDeliveries: [
        { path: "/submit", status: 200 },
        { path: "/reject", status: 503 },
        { path: "/reject", status: 503 },
        { path: "/submit", status: 200 },
      ],
    }).checks.runtimeFormAction
  ).toBe("passed");

  for (const value of [
    [{ dataSourceId: "unexpected" }],
    [{ dataSourceId: "runtime-source" }, { dataSourceId: "unexpected" }],
  ]) {
    const malformed = structuredClone(project);
    malformed.props.find((prop) => prop.id === "action")!.value = value;
    expect(
      evaluateHighImpactOutcome({
        fixture: managedFormRuntimeFixture,
        project: malformed,
        toolCalls: [{ name: "meta.guide" }, ...submissions],
        formRuntimeDeliveries: [
          { path: "/submit", status: 200 },
          { path: "/reject", status: 503 },
          { path: "/reject", status: 503 },
          { path: "/submit", status: 200 },
        ],
      }).checks.runtimeFormAction
    ).toBe("failed");
  }

  project.resources[0].url = '"https://somewhere-else.example/submit"';
  expect(
    evaluateHighImpactOutcome({
      fixture: managedFormRuntimeFixture,
      project,
      toolCalls: [
        { name: "meta.guide" },
        { name: "preview.start" },
        ...submissions,
        { name: "preview.stop" },
      ],
      formRuntimeDeliveries: [],
    }).checks.runtimeFormAction
  ).toBe("failed");
});
