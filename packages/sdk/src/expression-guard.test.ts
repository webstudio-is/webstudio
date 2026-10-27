import { describe, expect, test } from "vitest";
import {
  checkActionArg,
  checkActionCode,
  checkExpression,
  checkTag,
  findViolations,
} from "./expression-guard";

describe("saved expression guard", () => {
  test.each([
    `true); globalThis.__webstudioGuardMarker = true; (false`,
    `""["constructor"]["constructor"]("return 1")()`,
    `({})["con" + "structor"]`,
    `3n ** 300000000n`,
    `delete $ws$dataSource$id.value`,
    `"a".replace(/a/g, "b")`,
    `true; while (true) {}`,
    `({})["__proto__"]`,
    `({})[$ws$dataSource$id]`,
    `"x".replace.constructor("return 1")()`,
    `"x".split(/* hidden */ ",")`,
    `(function () { return 1 })()`,
    `new Date()`,
    `import("node:fs")`,
    `this.process`,
    `1, 2`,
    `$ws$dataSource$id++`,
  ])("refuses unsafe expression %s", (expression) => {
    expect(checkExpression(expression).ok).toBe(false);
  });

  test.each([
    `"Hello"`,
    `$ws$dataSource$id.title ?? "Untitled"`,
    `$ws$system.search.hidden === "1"`,
    `"A".toLowerCase()`,
    `Missing$32$variable`,
  ])("keeps builder expressions %s", (expression) => {
    expect(checkExpression(expression)).toEqual({ ok: true });
  });

  test("checks action code and names inserted into generated source", () => {
    expect(
      checkActionCode(`$ws$dataSource$id = event.target.value`, ["event"]).ok
    ).toBe(true);
    expect(
      checkActionCode(`$ws$dataSource$id = result.errors`, ["result"]).ok
    ).toBe(true);
    expect(
      checkActionCode(
        `({ results: $ws$dataSource$results = result.results, errors: $ws$dataSource$errors = result.errors })`,
        ["result"]
      ).ok
    ).toBe(true);
    expect(checkActionCode(`process.env.SECRET`, []).ok).toBe(false);
    expect(checkActionArg(`event); console.log(1); (`).ok).toBe(false);
    expect(checkTag(`script`).ok).toBe(false);
  });

  test("finds unsafe page values but leaves ordinary settings alone", () => {
    const page = {
      id: "home",
      name: "Home",
      path: "",
      rootInstanceId: "root",
      title: "Not found",
      meta: {
        description: `(globalThis.__webstudioGuardMarker = true)`,
        excludePageFromSearch: "true",
      },
    };
    expect(findViolations({ pages: [page] })).toMatchObject([
      { pageId: "home", field: "meta.description" },
    ]);
  });

  test("checks expression children, actions, and resource fields", () => {
    const crafted = `true); globalThis.__webstudioGuardMarker = true; (false`;
    const instance = {
      id: "root",
      type: "instance" as const,
      component: "Box",
      children: [{ type: "expression" as const, value: crafted }],
    };
    const prop = {
      id: "action",
      instanceId: "root",
      name: "onClick",
      type: "action" as const,
      value: [
        {
          type: "execute" as const,
          args: ["event"],
          code: "process.env.SECRET",
        },
      ],
    };
    const resource = {
      id: "resource",
      name: "Resource",
      method: "get" as const,
      url: crafted,
      headers: [],
      email: { subject: crafted },
    };
    expect(
      findViolations({
        instances: [instance],
        props: [prop],
        resources: [resource],
      })
    ).toMatchObject([
      { instanceId: "root", field: "children[0]" },
      { instanceId: "root", field: "props.onClick[0].code" },
      { resourceId: "resource", field: "url" },
      { resourceId: "resource", field: "email.subject" },
    ]);
  });

  test("keeps the old empty Element tag fallback", () => {
    expect(
      findViolations({
        instances: [
          {
            id: "old-element",
            type: "instance",
            component: "ws:element",
            tag: "",
            children: [],
          },
        ],
      })
    ).toEqual([]);
  });
});
