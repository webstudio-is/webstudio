import { elementComponent, type Instance, type Page } from "@webstudio-is/sdk";
import type { buildPatchTransaction } from "@webstudio-is/protocol";
import type { z } from "zod";

export const createPageRootInstance = (
  rootInstanceId: Instance["id"]
): Instance => ({
  type: "instance",
  id: rootInstanceId,
  component: elementComponent,
  tag: "body",
  children: [],
});

export const createPageValue = ({
  pageId,
  name,
  path,
  title = name,
  rootInstanceId,
  meta = {},
}: {
  pageId: Page["id"];
  name: Page["name"];
  path: Page["path"];
  title?: Page["title"];
  rootInstanceId: Instance["id"];
  meta?: Page["meta"];
}): Page => ({
  id: pageId,
  name,
  path,
  title,
  rootInstanceId,
  meta,
});

export const createPageCreatePayload = ({
  page,
  parentFolderId,
  parentChildIndex,
  rootInstance,
}: {
  page: Page;
  parentFolderId: string;
  parentChildIndex: number;
  rootInstance: Instance;
}): z.infer<typeof buildPatchTransaction>["payload"] => [
  {
    namespace: "pages",
    patches: [
      { op: "add", path: ["pages", page.id], value: page },
      {
        op: "add",
        path: ["folders", parentFolderId, "children", parentChildIndex],
        value: page.id,
      },
    ],
  },
  {
    namespace: "instances",
    patches: [
      {
        op: "add",
        path: [rootInstance.id],
        value: rootInstance,
      },
    ],
  },
];
