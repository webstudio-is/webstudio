import { expect, test } from "vitest";
import {
  ROOT_FOLDER_ID,
  blockComponent,
  type Folder,
  type Page,
  type Pages,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { $, renderData, ws } from "@webstudio-is/template";
import {
  formatPrePublishAuditFinding,
  runPrePublishAudit,
} from "./pre-publish-audit";

const createPages = (page: Page): Pages => {
  const rootFolder: Folder = {
    id: ROOT_FOLDER_ID,
    name: "Root",
    slug: "",
    children: [page.id],
  };
  return {
    homePageId: page.id,
    rootFolderId: rootFolder.id,
    pages: new Map([[page.id, page]]),
    folders: new Map([[rootFolder.id, rootFolder]]),
  };
};

const marketEdgePage: Page = {
  id: "marketedge",
  name: "MarketEdge",
  path: "/marketedge",
  title: "MarketEdge",
  rootInstanceId: "body",
  meta: {},
};

const runAudit = ({
  pages = createPages(marketEdgePage),
  ...data
}: {
  pages?: Pages;
  instances: Parameters<typeof runPrePublishAudit>[0]["instances"];
  props: Parameters<typeof runPrePublishAudit>[0]["props"];
}) =>
  runPrePublishAudit({
    pages,
    ...data,
    dataSources: new Map(),
    resources: new Map(),
    assets: new Map(),
    metas: componentMetas,
  });

test("warns without blocking legacy invalid HTML", () => {
  const { instances, props } = renderData(
    <$.Body ws:id="body">
      <ws.element ws:tag="button">
        <$.Heading ws:id="heading" ws:tag="h3">
          Legacy accordion trigger
        </$.Heading>
      </ws.element>
    </$.Body>
  );

  const findings = runAudit({ instances, props });

  expect(findings).toEqual([
    {
      ruleId: "html-content-model",
      severity: "warning",
      message: "Placing <h3> element inside a <button> violates HTML spec.",
      location: {
        pageId: "marketedge",
        pageName: "MarketEdge",
        pagePath: "/marketedge",
        instanceId: "heading",
      },
    },
  ]);
  expect(formatPrePublishAuditFinding(findings[0]!)).toBe(
    'Publish warning for "MarketEdge" (/marketedge): Placing <h3> element inside a <button> violates HTML spec.'
  );
});

test("allows valid publishable pages and ignores invalid drafts", () => {
  const { instances, props } = renderData(
    <>
      <$.Body ws:id="body">
        <$.Paragraph>Valid paragraph</$.Paragraph>
      </$.Body>
      <$.Body ws:id="draft-body">
        <$.Paragraph>
          <$.Heading ws:tag="h2">Invalid draft heading</$.Heading>
        </$.Paragraph>
      </$.Body>
    </>
  );
  const pages = createPages(marketEdgePage);
  const draftPage: Page = {
    ...marketEdgePage,
    id: "draft",
    name: "Draft",
    path: "/draft",
    rootInstanceId: "draft-body",
    isDraft: true,
  };
  pages.pages.set(draftPage.id, draftPage);

  expect(
    runAudit({
      pages,
      instances,
      props,
    })
  ).toEqual([]);
});

test("allows valid legacy CodeText children", () => {
  const { instances, props } = renderData(
    <$.Body ws:id="body">
      <$.CodeText>
        <$.Text ws:tag="span">Legacy code text</$.Text>
      </$.CodeText>
    </$.Body>
  );

  expect(runAudit({ instances, props })).toEqual([]);
});

test("allows Video inside a Div with valid children", () => {
  const { instances, props } = renderData(
    <$.Body ws:id="body">
      <$.Box>
        <$.Video>
          <ws.element ws:tag="source" />
          <ws.element ws:tag="track" />
        </$.Video>
      </$.Box>
    </$.Body>
  );

  expect(runAudit({ instances, props })).toEqual([]);
});

test("reports the Link constraint for Video inside a Div", () => {
  const { instances, props } = renderData(
    <$.Body ws:id="body">
      <$.Link>
        <$.Box>
          <$.Video ws:id="video" controls />
        </$.Box>
      </$.Link>
    </$.Body>
  );

  expect(runAudit({ instances, props })).toEqual([
    {
      ruleId: "html-content-model",
      severity: "warning",
      message: "Placing <video> element inside a <a> violates HTML spec.",
      location: {
        pageId: "marketedge",
        pageName: "MarketEdge",
        pagePath: "/marketedge",
        instanceId: "video",
      },
    },
  ]);
});

test("warns about unknown element tags without throwing", () => {
  const { instances, props } = renderData(
    <$.Body ws:id="body">
      <ws.element ws:id="custom" ws:tag="custom-element">
        <$.Paragraph>Custom element content</$.Paragraph>
      </ws.element>
    </$.Body>
  );

  expect(runAudit({ instances, props })).toEqual([
    {
      ruleId: "html-content-model",
      severity: "warning",
      message:
        "Placing <custom-element> element inside a <body> violates HTML spec.",
      location: {
        pageId: "marketedge",
        pageName: "MarketEdge",
        pagePath: "/marketedge",
        instanceId: "custom",
      },
    },
  ]);
});

test("allows legacy components with unknown tags", () => {
  const { instances, props } = renderData(
    <$.Body ws:id="body">
      <ws.element ws:id="legacy" ws:tag="legacy-element" />
    </$.Body>
  );
  const legacyInstance = instances.get("legacy");
  if (legacyInstance === undefined) {
    throw new Error("Expected legacy instance");
  }
  legacyInstance.component = "LegacyComponent";

  expect(runAudit({ instances, props })).toEqual([]);
});

test("blocks publishing when required audit input is unavailable", () => {
  const { instances, props } = renderData(<$.Body ws:id="body"></$.Body>);

  const findings = runPrePublishAudit({
    pages: undefined,
    instances,
    props,
    dataSources: new Map(),
    resources: new Map(),
    assets: new Map(),
    metas: componentMetas,
  });

  expect(findings[0]).toMatchObject({
    ruleId: "project-data",
    severity: "error",
    location: {},
  });
  expect(formatPrePublishAuditFinding(findings[0]!)).toBe(
    "Cannot publish: Project pages are unavailable. Reload the Builder and try again."
  );
});

test("includes existing resource integrity checks in the audit pipeline", () => {
  const { instances, props } = renderData(<$.Body ws:id="body"></$.Body>);
  const findings = runPrePublishAudit({
    pages: createPages(marketEdgePage),
    instances,
    props,
    dataSources: new Map([
      [
        "resource-variable",
        {
          id: "resource-variable",
          scopeInstanceId: "body",
          name: "Products",
          type: "resource",
          resourceId: "missing-resource",
        },
      ],
    ]),
    resources: new Map(),
    assets: new Map(),
    metas: componentMetas,
  });

  expect(findings).toEqual([
    {
      ruleId: "resource-integrity",
      severity: "error",
      message:
        'resource variable "Products" (resource-variable) references missing resource "missing-resource".',
      location: {
        dataSourceId: "resource-variable",
        resourceId: "missing-resource",
      },
    },
  ]);
});

test("includes Content Block source integrity checks in the audit pipeline", () => {
  const { instances, props } = renderData(<$.Body ws:id="body"></$.Body>);
  instances.set("block", {
    type: "instance",
    id: "block",
    component: blockComponent,
    children: [],
  });
  props.set("source", {
    id: "source",
    instanceId: "block",
    name: "src",
    type: "asset",
    value: "missing-post",
  });

  expect(runAudit({ instances, props })).toContainEqual({
    ruleId: "content-block-source-integrity",
    severity: "error",
    message:
      'Content Block source prop "source" references missing Asset "missing-post".',
    location: {
      instanceId: "block",
      propId: "source",
      assetId: "missing-post",
    },
  });
});
