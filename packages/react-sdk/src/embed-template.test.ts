import { expect, test } from "@jest/globals";
import { generateDataFromEmbedTemplate } from "./embed-template";

const expectString = expect.any(String) as unknown as string;

test("generate tree from template", () => {
  expect(
    generateDataFromEmbedTemplate([
      { type: "text", value: "hello" },
      {
        type: "instance",
        component: "Box1",
        children: [
          { type: "instance", component: "Box2", children: [] },
          { type: "text", value: "world" },
        ],
      },
    ])
  ).toEqual({
    children: [
      { type: "text", value: "hello" },
      { type: "id", value: expectString },
    ],
    instances: [
      {
        type: "instance",
        id: expectString,
        component: "Box1",
        children: [
          { type: "id", value: expectString },
          { type: "text", value: "world" },
        ],
      },
      {
        type: "instance",
        id: expectString,
        component: "Box2",
        children: [],
      },
    ],
  });
});
