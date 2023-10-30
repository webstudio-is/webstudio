/* eslint-disable */
/* This is a auto generated file for building the project */

import { type ReactNode, useState } from "react";
import type { PageData } from "~/routes/_index";
import type { Asset, ImageAsset, SiteMeta } from "@webstudio-is/sdk";
import {
  Body as Body,
  Heading as Heading,
  Text as Text,
} from "@webstudio-is/sdk-components-react";

export const fontAssets: Asset[] = [];
export const imageAssets: ImageAsset[] = [];
export const pageData: PageData = {
  page: {
    id: "9di_L14CzctvSruIoKVvE",
    name: "Home",
    title: "Home",
    meta: {},
    rootInstanceId: "MMimeobf_zi4ZkRGXapju",
    path: "",
  },
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "d845c167-ea07-4875-b08d-83e97c09dcce";

const Page = (props: { scripts?: ReactNode }) => {
  return (
    <Body data-ws-id="MMimeobf_zi4ZkRGXapju" data-ws-component="Body">
      <Heading data-ws-id="MYDt0guk1-vzc7yzqyN6A" data-ws-component="Heading">
        {"Simple Project to test CLI"}
      </Heading>
      <Text data-ws-id="BMJfjOzunWs8XkQgvvx1e" data-ws-component="Text">
        {"Please don't change directly in the fixture"}
      </Text>
      {props.scripts}
    </Body>
  );
};

export { Page };

export const pagesPaths = new Set([""]);

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
