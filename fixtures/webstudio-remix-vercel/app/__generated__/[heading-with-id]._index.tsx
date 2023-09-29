/* eslint-disable */
/* This is a auto generated file for building the project */

import { type ReactNode, useState } from "react";
import type { PageData } from "~/routes/_index";
import type { Asset } from "@webstudio-is/sdk";
import {
  Body as Body,
  Heading as Heading,
} from "@webstudio-is/sdk-components-react";

export const fontAssets: Asset[] = [];
export const pageData: PageData = {
  page: {
    id: "-J9I4Oo6mONfQlf_3-OqG",
    name: "heading-with-id",
    title: "heading-with-id",
    meta: { description: "" },
    rootInstanceId: "O-ljaGZQ0iRNTlEshMkgE",
    path: "/heading-with-id",
  },
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

const Page = (props: { scripts?: ReactNode }) => {
  return (
    <Body data-ws-id="O-ljaGZQ0iRNTlEshMkgE" data-ws-component="Body">
      <Heading
        data-ws-id="qmxnOlSxUGpuhuonVArWJ"
        data-ws-component="Heading"
        id={"my-heading"}
      >
        {"Heading you can edit"}
      </Heading>
      {props.scripts}
    </Body>
  );
};

export { Page };

export const pagesPaths = new Set([
  "",
  "/radix",
  "/_route_with_symbols_",
  "/form",
  "/heading-with-id",
]);

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
