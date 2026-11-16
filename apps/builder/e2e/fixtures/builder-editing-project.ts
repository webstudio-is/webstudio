import { randomUUID } from "node:crypto";
import type { BrowserContext, Page } from "@playwright/test";
import {
  migratePages,
  serializePages,
} from "@webstudio-is/project-migrations/pages";
import type { Instance } from "@webstudio-is/sdk";
import { createSeededBuilderProject } from "./builder-project";

export const pageTemplateName = "Content Page Template";
export const pageTemplateText = "Content page template heading";

export const createBuilderEditingProject = ({
  context,
  page,
  name,
  includePageTemplate = false,
}: {
  context: BrowserContext;
  page?: Page;
  name: string;
  includePageTemplate?: boolean;
}) =>
  createSeededBuilderProject({
    context,
    page,
    email: `${name}@webstudio.test`,
    title: name,
    builderToken: `${name}-${randomUUID()}-builder-token`,
    createBuildUpdate: (build) => {
      const pages = migratePages(JSON.parse(build.pages));
      const home = pages.pages.get(pages.homePageId);
      if (home === undefined) {
        throw new Error("Expected the fixture home page");
      }
      home.rootInstanceId = "body";
      const instances: Instance[] = [
        {
          type: "instance",
          id: "body",
          component: "ws:element",
          tag: "body",
          children: [{ type: "id", value: "initial-content" }],
        },
        {
          type: "instance",
          id: "initial-content",
          component: "ws:element",
          tag: "p",
          children: [{ type: "text", value: "Initial content" }],
        },
      ];
      if (includePageTemplate) {
        const rootInstanceId = "page-template-body";
        pages.pageTemplates = new Map([
          [
            "content-page-template",
            {
              id: "content-page-template",
              rootInstanceId,
              name: pageTemplateName,
              title: JSON.stringify(pageTemplateName),
              meta: {},
            },
          ],
        ]);
        instances.push(
          {
            type: "instance",
            id: rootInstanceId,
            component: "ws:element",
            tag: "body",
            children: [{ type: "id", value: "page-template-heading" }],
          },
          {
            type: "instance",
            id: "page-template-heading",
            component: "ws:element",
            tag: "h1",
            children: [{ type: "text", value: pageTemplateText }],
          }
        );
      }
      return {
        pages: JSON.stringify(serializePages(pages)),
        instances: JSON.stringify(instances),
        dataSources: "[]",
        props: "[]",
        resources: "[]",
        styleSources: "[]",
        styleSourceSelections: "[]",
        styles: "[]",
      };
    },
  });
