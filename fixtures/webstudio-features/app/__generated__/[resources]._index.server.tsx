/* eslint-disable */
      /* This is a auto generated file for building the project */ 


      import type { PageMeta } from "@webstudio-is/sdk";
      import { toWebstudioParams } from "@webstudio-is/react-sdk";
      import type { System, ResourceRequest } from "@webstudio-is/sdk";
import type { ResourceRequestGraph } from "@webstudio-is/sdk/runtime";
export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
  const list_1 = (documents: ReadonlyMap<string, unknown>): ResourceRequest => {
    return {
      name: "list",
      url: "https://gist.githubusercontent.com/TrySound/56507c301ec85669db5f1541406a9259/raw/a49548730ab592c86b9e7781f5b29beec4765494/collection.json",
      searchParams: [
      ],
      method: "get",
      headers: [
      ],
    }
  }
  const _data: ResourceRequestGraph = {
    resources: [
      { id: "1vX6SQdaCjJN6MvJlG_cQ", outputName: "list_1", dependencies: [], createRequest: list_1 },
    ],
    rootIds: [
      "1vX6SQdaCjJN6MvJlG_cQ",
    ],
  }
  const _contentData = new Map<string, ResourceRequest>()
  const _action = new Map<string, { id: string; outputName: string }>([
  ])
  return { data: _data, action: _action, contentData: _contentData }
}


      import type { ManagedFormResourceGraph } from "@webstudio-is/sdk/runtime";
import { createJsonStringifyProxy } from "@webstudio-is/sdk/to-string";
export const getManagedFormResourceGraph = (formId: string, _managedFormProps: { system: System; formData: unknown; browserInfo: unknown }): ManagedFormResourceGraph | undefined => {
  switch (formId) {
    default: return undefined;
  }
};


      export const getPageMeta = ({
  system,
  resources,
}: {
  system: System;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "resources",
    description: "",
    excludePageFromSearch: false,
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


      export const getRemixParams = (params: Record<string, string | undefined>) => toWebstudioParams("/resources", params);

      export const getManagedFormSubmissions = () =>
        new Map<string, { action: unknown; resourceIds: (string | null)[] }>(
          []
        );

      export const contactEmail = "hello@webstudio.is";
    