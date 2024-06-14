import { expect, test } from "@jest/globals";
import { $, renderJsx } from "./jsx";

test("render jsx into instances with generated id", () => {
  const { instances } = renderJsx(
    <$.Body>
      <$.Box></$.Box>
      <$.Box></$.Box>
    </$.Body>
  );
  expect(instances).toEqual(
    new Map([
      [
        "0",
        {
          type: "instance",
          id: "0",
          component: "Body",
          children: [
            { type: "id", value: "1" },
            { type: "id", value: "2" },
          ],
        },
      ],
      [
        "1",
        {
          type: "instance",
          id: "1",
          component: "Box",
          children: [],
        },
      ],
      [
        "2",
        {
          type: "instance",
          id: "2",
          component: "Box",
          children: [],
        },
      ],
    ])
  );
});

test("override generated ids with ws:id prop", () => {
  const { instances } = renderJsx(
    <$.Body ws:id="custom1">
      <$.Box ws:id="custom2">
        <$.Span ws:id="custom3"></$.Span>
      </$.Box>
    </$.Body>
  );
  expect(instances).toEqual(
    new Map([
      [
        "custom1",
        {
          type: "instance",
          id: "custom1",
          component: "Body",
          children: [{ type: "id", value: "custom2" }],
        },
      ],
      [
        "custom2",
        {
          type: "instance",
          id: "custom2",
          component: "Box",
          children: [{ type: "id", value: "custom3" }],
        },
      ],
      [
        "custom3",
        {
          type: "instance",
          id: "custom3",
          component: "Span",
          children: [],
        },
      ],
    ])
  );
});
