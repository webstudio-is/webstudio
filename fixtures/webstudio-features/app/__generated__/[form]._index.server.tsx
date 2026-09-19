/* eslint-disable */
      /* This is a auto generated file for building the project */ 


      import type { PageMeta } from "@webstudio-is/sdk";
      import type { System, ResourceRequest } from "@webstudio-is/sdk";
import type { ResourceRequestGraph } from "@webstudio-is/sdk/runtime";
export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
  const action = (documents: ReadonlyMap<string, unknown>): ResourceRequest => {
    return {
      name: "action",
      url: "/custom",
      searchParams: [
      ],
      method: "get",
      headers: [
        { name: "Content-Type", value: "application/json" },
      ],
    }
  }
  const _data: ResourceRequestGraph = {
    resources: [
      { id: "isNSM3wXcnHFikwNPlEOL", outputName: "action", dependencies: [], createRequest: action },
    ],
    rootIds: [
    ],
  }
  const _contentData = new Map<string, ResourceRequest>()
  const _action = new Map<string, { id: string; outputName: string }>([
    ["action", { id: "isNSM3wXcnHFikwNPlEOL", outputName: "action" }],
  ])
  return { data: _data, action: _action, contentData: _contentData }
}


      export const getPageMeta = ({
  system,
  resources,
}: {
  system: System;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "form",
    description: "",
    excludePageFromSearch: undefined,
    language: undefined,
    socialImageAssetName: undefined,
    socialImageUrl: undefined,
    status: undefined,
    redirect: undefined,
    content: undefined,
    custom: [
    ],
  };
};


      type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params
}


      export const contactEmail = "hello@webstudio.is";
    