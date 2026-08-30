/* eslint-disable */
      /* This is a auto generated file for building the project */ 


      import type { PageMeta } from "@webstudio-is/sdk";
      import type { System, ResourceRequest } from "@webstudio-is/sdk";
import type { ResourceRequestGraph } from "@webstudio-is/sdk/runtime";
export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
  const jsonResourceVariable_1 = (documents: ReadonlyMap<string, unknown>): ResourceRequest => {
    return {
      name: "jsonResourceVariable",
      url: "https://httpbin.org/get?hello=world",
      searchParams: [
      ],
      method: "get",
      headers: [
      ],
    }
  }
  const _data: ResourceRequestGraph = {
    resources: [
      { id: "fjMzCru8O2U31xY2P1Ovr", outputName: "jsonResourceVariable_1", dependencies: [], createRequest: jsonResourceVariable_1 },
    ],
    rootIds: [
      "fjMzCru8O2U31xY2P1Ovr",
    ],
  }
  const _contentData = new Map<string, ResourceRequest>()
  const _action = new Map<string, ResourceRequest>([
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
    title: "Untitled",
    description: "",
    excludePageFromSearch: true,
    language: "",
    socialImageAssetName: undefined,
    socialImageUrl: "",
    status: 200,
    redirect: "",
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
    