/* eslint-disable */
/* This is a auto generated file for building the project */

import * as sdk from "@webstudio-is/react-sdk";
import type { PageData } from "~/routes/_index";
import type { Components } from "@webstudio-is/react-sdk";
import type { Asset } from "@webstudio-is/sdk";
import {
  Body as Body,
  Image as Image,
} from "@webstudio-is/sdk-components-react";

export const components = new Map(
  Object.entries({ Body: Body, Image: Image })
) as Components;
export const fontAssets: Asset[] = [];
export const pageData: PageData = {
  build: {
    props: [
      [
        "HNaXZUvlg14jFvxc29n9T",
        {
          id: "HNaXZUvlg14jFvxc29n9T",
          instanceId: "AdXSAYCx4QDo5QN6nLoGs",
          name: "src",
          type: "asset",
          value: "9a8bc926-7804-4d3f-af81-69196b1d2ed8",
        },
      ],
    ],
    instances: [
      [
        "EDEfpMPRqDejthtwkH7ws",
        {
          type: "instance",
          id: "EDEfpMPRqDejthtwkH7ws",
          component: "Body",
          children: [{ type: "id", value: "AdXSAYCx4QDo5QN6nLoGs" }],
        },
      ],
      [
        "AdXSAYCx4QDo5QN6nLoGs",
        {
          type: "instance",
          id: "AdXSAYCx4QDo5QN6nLoGs",
          component: "Image",
          label: "webp image, used to test raw image uploads",
          children: [],
        },
      ],
    ],
    dataSources: [],
  },
  pages: [
    {
      id: "7Db64ZXgYiRqKSQNR-qTQ",
      name: "Home",
      title: "Home",
      meta: {},
      rootInstanceId: "On9cvWCxr5rdZtY9O1Bv0",
      path: "",
    },
    {
      id: "xfvB4UThQXmQ_OubPYrkg",
      name: "radix",
      title: "radix",
      meta: { description: "" },
      rootInstanceId: "uKWGyE9JY3cPwY-xI9vk6",
      path: "/radix",
    },
    {
      id: "szYLvBduHPmbtqQKCDY0b",
      name: "RouteWithSymbols",
      title: "RouteWithSymbols",
      meta: { description: "" },
      rootInstanceId: "EDEfpMPRqDejthtwkH7ws",
      path: "/_route_with_symbols_",
    },
  ],
  page: {
    id: "szYLvBduHPmbtqQKCDY0b",
    name: "RouteWithSymbols",
    title: "RouteWithSymbols",
    meta: { description: "" },
    rootInstanceId: "EDEfpMPRqDejthtwkH7ws",
    path: "/_route_with_symbols_",
  },
  assets: [
    {
      id: "9a8bc926-7804-4d3f-af81-69196b1d2ed8",
      name: "small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp",
      description: null,
      projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
      size: 2906,
      type: "image",
      format: "webp",
      createdAt: "2023-09-12T09:44:22.120Z",
      meta: { width: 100, height: 100 },
    },
    {
      id: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
      name: "_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg",
      description: null,
      projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
      size: 210614,
      type: "image",
      format: "jpeg",
      createdAt: "2023-09-06T11:28:43.031Z",
      meta: { width: 1024, height: 1024 },
    },
  ],
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

/* eslint-disable */

const indexesWithinAncestors = new Map<string, number>([]);

const rawExecuteComputingExpressions = (
  _variables: Map<string, unknown>
): Map<string, unknown> => {
  return new Map([]);
};
const executeComputingExpressions = (variables: Map<string, unknown>) => {
  const encodedvariables = sdk.encodeVariablesMap(variables);
  const encodedResult = rawExecuteComputingExpressions(encodedvariables);
  return sdk.decodeVariablesMap(encodedResult);
};

const generatedEffectfulExpressions = new Map<
  string,
  (args: Map<string, any>, variables: Map<string, any>) => Map<string, unknown>
>([]);

const rawExecuteEffectfulExpression = (
  code: string,
  args: Map<string, unknown>,
  variables: Map<string, unknown>
): Map<string, unknown> => {
  if (generatedEffectfulExpressions.has(code)) {
    return generatedEffectfulExpressions.get(code)!(args, variables);
  }
  console.error("Effectful expression not found", code);
  throw new Error("Effectful expression not found");
};

const executeEffectfulExpression = (
  code: string,
  args: Map<string, unknown>,
  variables: Map<string, unknown>
) => {
  const encodedvariables = sdk.encodeVariablesMap(variables);
  const encodedResult = rawExecuteEffectfulExpression(
    code,
    args,
    encodedvariables
  );
  return sdk.decodeVariablesMap(encodedResult);
};

export const utils = {
  indexesWithinAncestors,
  executeComputingExpressions,
  executeEffectfulExpression,
};

/* eslint-enable */
