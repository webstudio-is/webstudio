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
    title: "Nested Page",
    description: "",
    excludePageFromSearch: false,
    language: undefined,
    socialImageAssetId: "",
    socialImageUrl: undefined,
    status: undefined,
    redirect: undefined,
    custom: [],
  };
};

type FormProperties = { method?: string; action?: string };
export const formsProperties = new Map<string, FormProperties>([]);

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};

export const customCode = "<script>console.log('KittyGuardedZone')</script>";
