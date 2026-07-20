import { expect, test } from "vitest";
import {
  ROOT_FOLDER_ID,
  type Folder,
  type Page,
  type Pages,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { $, renderData } from "@webstudio-is/template";
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
    metas: componentMetas,
  });

test("returns a blocking finding with the page and instance identity", () => {
  const { instances, props } = renderData(
    <$.Body ws:id="body">
      <$.Paragraph>
        <$.Heading ws:id="heading" ws:tag="h2">
          Analyze Global Markets
        </$.Heading>
      </$.Paragraph>
    </$.Body>
  );

  const findings = runAudit({ instances, props });

  expect(findings).toEqual([
    {
      ruleId: "html-content-model",
      severity: "error",
      message: "Placing <h2> element inside a <p> violates HTML spec.",
      location: {
        pageId: "marketedge",
        pageName: "MarketEdge",
        pagePath: "/marketedge",
        instanceId: "heading",
      },
    },
  ]);
  expect(formatPrePublishAuditFinding(findings[0]!)).toBe(
    'Cannot publish "MarketEdge" (/marketedge): Placing <h2> element inside a <p> violates HTML spec.'
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

test("blocks publishing when required audit input is unavailable", () => {
  const { instances, props } = renderData(<$.Body ws:id="body"></$.Body>);

  const findings = runPrePublishAudit({
    pages: undefined,
    instances,
    props,
    dataSources: new Map(),
    resources: new Map(),
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
