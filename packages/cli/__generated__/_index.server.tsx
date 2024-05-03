/**
 * The only intent of this file is to support typings inside ../templates/route-template for easier development.
 **/
import type { PageMeta, System } from "@webstudio-is/sdk";

export const loadResources = async (_props: { system: System }) => {
  const [] = await Promise.all([]);
  return {} as Record<string, unknown>;
};

export const getPageMeta = ({}: {
  system: System;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Page title",
    custom: [],
  };
};

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const projectId = "project-id";

export const contactEmail: undefined | string = undefined;

export const customCode = "";
