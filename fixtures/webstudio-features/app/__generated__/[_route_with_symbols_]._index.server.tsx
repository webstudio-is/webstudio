/* eslint-disable */
      /* This is a auto generated file for building the project */ 


      import type { PageMeta } from "@webstudio-is/sdk";
      import { toWebstudioParams } from "@webstudio-is/react-sdk";
      import type { System, ResourceRequest } from "@webstudio-is/sdk";
import type { ResourceRequestGraph } from "@webstudio-is/sdk/runtime";
export const getResources = (_props: { system: System; resources?: Record<string, any> }) => {
  const _data: ResourceRequestGraph = {
    resources: [
    ],
    rootIds: [
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
    title: "RouteWithSymbols",
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


      export const getRemixParams = (params: Record<string, string | undefined>) => toWebstudioParams("/_route_with_symbols_", params);

      export const getManagedFormSubmissions = () =>
        new Map<string, { action: unknown; resourceIds: (string | null)[] }>(
          []
        );

      export const contactEmail = "hello@webstudio.is";
    