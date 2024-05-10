/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageMeta } from "@webstudio-is/sdk";
import { loadResource, isLocalResource, type System } from "@webstudio-is/sdk";
export const loadResources = async (_props: { system: System }) => {
  return {} as Record<string, unknown>;
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
    socialImageAssetId: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
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

type FormProperties = { method?: string; action?: string };
export const formsProperties = new Map<string, FormProperties>([]);

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const contactEmail = "hello@webstudio.is";

export const customCode = "<script>console.log('KittyGuardedZone')</script>";
