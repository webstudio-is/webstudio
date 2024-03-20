/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageMeta } from "@webstudio-is/sdk";
import { loadResource, type System } from "@webstudio-is/sdk";
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
    title: "Radix Revelations: Unraveling the Feline Mystique",
    description:
      "Delve deep into the radix roots of feline behaviors. At KittyNoTouchy, we dissect the core essence, or 'radix', of what makes cats the enigmatic creatures they are. Join us as we explore the radix of their instincts, habits, and quirks.",
    excludePageFromSearch: true,
    language: undefined,
    socialImageAssetId: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
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
