/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageMeta } from "@webstudio-is/sdk";
import type { System, ResourceRequest } from "@webstudio-is/sdk";
export const getResources = (_props: { system: System }) => {
  const _data = new Map<string, ResourceRequest>([]);
  const _action = new Map<string, ResourceRequest>([]);
  return { data: _data, action: _action };
};

export const getPageMeta = ({
  system,
  resources,
}: {
  system: System;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "The Ultimate Cat Protection Zone",
    description:
      "Dive into the world of felines and discover why some whiskers are best left untouched. From intriguing cat behaviors to protective measures, \nKittyGuardedZone is your go-to hub for all things 'hands-off' in the cat realm.",
    excludePageFromSearch: undefined,
    language: undefined,
    socialImageAssetName:
      "_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg",
    socialImageUrl: undefined,
    status: undefined,
    redirect: undefined,
    custom: [
      {
        property: "fb:app_id",
        content: "app_id_app_id_app_id",
      },
    ],
  };
};

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const contactEmail = "hello@webstudio.is";
