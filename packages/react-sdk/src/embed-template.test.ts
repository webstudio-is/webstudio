import { expect, test } from "@jest/globals";
import { generateDataFromEmbedTemplate } from "./embed-template";

const expectString = expect.any(String) as unknown as string;

test("generate data for embedding from instances and text", () => {
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
    props: [],
  });
});

test("generate data for embedding from props", () => {
  expect(
    generateDataFromEmbedTemplate([
      {
        type: "instance",
        component: "Box1",
        props: [
          { type: "string", name: "data-prop1", value: "value1" },
          { type: "string", name: "data-prop2", value: "value2" },
        ],
        children: [
          {
            type: "instance",
            component: "Box2",
            props: [{ type: "string", name: "data-prop3", value: "value3" }],
            children: [],
          },
        ],
      },
    ])
  ).toEqual({
    children: [{ type: "id", value: expectString }],
    instances: [
      {
        type: "instance",
        id: expectString,
        component: "Box1",
        children: [{ type: "id", value: expectString }],
      },
      {
        type: "instance",
        id: expectString,
        component: "Box2",
        children: [],
      },
    ],
    props: [
      {
        type: "string",
        id: expectString,
        instanceId: expectString,
        name: "data-prop1",
        value: "value1",
      },
      {
        type: "string",
        id: expectString,
        instanceId: expectString,
        name: "data-prop2",
        value: "value2",
      },
      {
        type: "string",
        id: expectString,
        instanceId: expectString,
        name: "data-prop3",
        value: "value3",
      },
    ],
  });
});
