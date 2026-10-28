import { describe, expect, test } from "vitest";
import {
  checkActionArg,
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
    expect(checkExpression(expression)).toBe(false);
  });

  test.each([
    `"Hello"`,
    `$ws$dataSource$id.title ?? "Untitled"`,
    `$ws$system.search.hidden === "1"`,
    `"A".toLowerCase()`,
    `Missing$32$variable`,
  ])("keeps builder expressions %s", (expression) => {
    expect(checkExpression(expression)).toBe(true);
  });

  test("checks action names inserted into generated source", () => {
    expect(checkActionArg("event")).toBe(true);
    expect(checkActionArg(`event); console.log(1); (`)).toBe(false);
    expect(checkTag(`script`)).toBe(false);
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

  test("checks expression children and resource fields", () => {
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
          code: "console.log(event)",
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
