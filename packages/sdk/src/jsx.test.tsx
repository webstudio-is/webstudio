import { expect, test } from "@jest/globals";
import { $, renderJsx } from "./jsx";

test("render jsx into instances with generated id", () => {
  const { instances } = renderJsx(
    <$.Body>
      <$.Box></$.Box>
      <$.Box></$.Box>
    </$.Body>
  );
  expect(instances.size).toEqual(3);
  const [bodyId, boxOneId, boxTwoId] = instances.keys();
  expect(instances.get(bodyId)).toEqual({
    type: "instance",
    id: bodyId,
    component: "Body",
    children: [
      { type: "id", value: boxOneId },
      { type: "id", value: boxTwoId },
    ],
  });
  expect(instances.get(boxOneId)).toEqual({
    type: "instance",
    id: boxOneId,
    component: "Box",
    children: [],
  });
  expect(instances.get(boxTwoId)).toEqual({
    type: "instance",
    id: boxTwoId,
    component: "Box",
    children: [],
  });
});

test("override generated ids with ws:id prop", () => {
  const { instances } = renderJsx(
    <$.Body ws:id="1">
      <$.Box ws:id="2">
        <$.Span ws:id="3"></$.Span>
      </$.Box>
    </$.Body>
  );
  expect(instances).toEqual(
    new Map([
      [
        "1",
        {
          type: "instance",
          id: "1",
          component: "Body",
          children: [{ type: "id", value: "2" }],
        },
      ],
      [
        "2",
        {
          type: "instance",
          id: "2",
          component: "Box",
          children: [{ type: "id", value: "3" }],
        },
      ],
      [
        "3",
        {
          type: "instance",
          id: "3",
          component: "Span",
          children: [],
        },
      ],
    ])
  );
});
