/* eslint-disable */
      /* This is a auto generated file for building the project */ 


      import type { PageMeta } from "@webstudio-is/sdk";
      import type { System, ResourceRequest } from "@webstudio-is/sdk";
import type { ResourceRequestGraph } from "@webstudio-is/sdk/runtime";
export const getResources = (_props: { system: System }) => {
  const assets_1 = (documents: ReadonlyMap<string, unknown>): ResourceRequest => {
    return {
      name: "assets",
      control: "system",
      url: "/$resources/assets",
      searchParams: [
      ],
      method: "post",
      headers: [
        { name: "Content-Type", value: "application/json" },
      ],
      body: {
  query: ({
    output: {
        mode: "fields",
        includeMetadata: false,
        fields: [["url"], ["width"], ["height"]],
      },
    content: {
        mode: "none",
      },
    result: "many",
    where: {
        all: [],
      },
    sort: [],
    limit: 1000,
    offset: 0,
  }),
},
    }
  }
  const _data: ResourceRequestGraph = {
    resources: [
      { id: "oIYuHoIwG7GM5J9cCSsai", outputName: "assets_1", dependencies: [], createRequest: assets_1 },
    ],
    rootIds: [
      "oIYuHoIwG7GM5J9cCSsai",
    ],
  }
  const _action = new Map<string, ResourceRequest>([
  ])
  return { data: _data, action: _action }
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
    status: undefined,
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
    