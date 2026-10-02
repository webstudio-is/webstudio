/* eslint-disable */
      /* This is a auto generated file for building the project */ 


      import type { PageMeta } from "@webstudio-is/sdk";
      import { toWebstudioParams } from "@webstudio-is/react-sdk";
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
  const _action = new Map<string, { id: string; outputName: string }>([
  ])
  return { data: _data, action: _action, contentData: _contentData }
}


      export const getManagedFormResourceGraph = (formId: string, _managedFormProps: { system: System; formData: unknown; browserInfo: unknown }): ResourceRequestGraph | undefined => {
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


      export const getRemixParams = (params: Record<string, string | undefined>) => toWebstudioParams("/expressions", params);

      export const getManagedFormSubmissions = () =>
        new Map<string, { submission: unknown; resourceIds: (string | null)[] }>(
          []
        );

      export const contactEmail = "hello@webstudio.is";
    