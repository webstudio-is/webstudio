import { expect, test } from "vitest";
import { findAwarenessByInstanceId } from "./awareness";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $, renderData } from "@webstudio-is/template";

test("find awareness by instance", () => {
  const pages = createDefaultPages({
    homePageId: "homePageId",
    rootInstanceId: "bodyId",
  });
  const { instances } = renderData(
    <$.Body ws:id="bodyId">
      <$.Box ws:id="boxId">
        <$.Text ws:id="textId"></$.Text>
      </$.Box>
    </$.Body>
  );
  expect(findAwarenessByInstanceId(pages, instances, "textId")).toEqual({
    pageId: "homePageId",
    instanceSelector: ["textId", "boxId", "bodyId"],
  });
});

test("find awareness by instance inside of slot", () => {
  const pages = createDefaultPages({
    homePageId: "homePageId",
    rootInstanceId: "bodyId",
  });
  const { instances } = renderData(
    <$.Body ws:id="bodyId">
      <$.Slot ws:id="slotOneId">
        <$.Fragment ws:id="fragmentId">
          <$.Box ws:id="boxId"></$.Box>
        </$.Fragment>
      </$.Slot>
      <$.Slot ws:id="slotTwoId">
        <$.Fragment ws:id="fragmentId">
          <$.Box ws:id="boxId"></$.Box>
        </$.Fragment>
      </$.Slot>
    </$.Body>
  );
  expect(findAwarenessByInstanceId(pages, instances, "boxId")).toEqual({
    pageId: "homePageId",
    instanceSelector: ["boxId", "fragmentId", "slotTwoId", "bodyId"],
  });
});
