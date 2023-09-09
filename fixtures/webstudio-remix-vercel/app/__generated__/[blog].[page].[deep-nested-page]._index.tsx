/* eslint-disable */
/* This is a auto generated file for building the project */

import * as sdk from "@webstudio-is/react-sdk";
import type { PageData } from "~/routes/_index";
import type { Components } from "@webstudio-is/react-sdk";
import type { Asset } from "@webstudio-is/sdk";
import {
  Body as Body,
  Heading as Heading,
} from "@webstudio-is/sdk-components-react";
import { Link as Link } from "@webstudio-is/sdk-components-react-remix";

export const components = new Map(
  Object.entries({ Body: Body, Heading: Heading, Link: Link })
) as Components;
export const fontAssets: Asset[] = [];
export const pageData: PageData = {
  build: {
    props: [],
    instances: [
      [
        "P_qm1M69qwe6M2aaNBzOH",
        {
          type: "instance",
          id: "P_qm1M69qwe6M2aaNBzOH",
          component: "Body",
          children: [
            { type: "id", value: "UG0MSNfRWyyac4KR3fFyg" },
            { type: "id", value: "Zh_5yzptz6BB60Va6TlVv" },
          ],
        },
      ],
      [
        "UG0MSNfRWyyac4KR3fFyg",
        {
          type: "instance",
          id: "UG0MSNfRWyyac4KR3fFyg",
          component: "Heading",
          children: [{ type: "text", value: "Deep nested" }],
        },
      ],
      [
        "Zh_5yzptz6BB60Va6TlVv",
        {
          type: "instance",
          id: "Zh_5yzptz6BB60Va6TlVv",
          component: "Link",
          children: [{ type: "text", value: "Link text you can edit" }],
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
      id: "w9Qwfu1HOP397jLNtq-hc",
      name: "Blog",
      title: "Blog",
      meta: { description: "" },
      rootInstanceId: "xDnAIGJjaOVjOfMU6bbxQ",
      path: "/blog",
    },
    {
      id: "hd6G3bz113YtoxD-3lNAI",
      name: "Page",
      title: "Page",
      meta: { description: "" },
      rootInstanceId: "nEyRUCIYmfkBYUb-MSdDd",
      path: "/blog/page",
    },
    {
      id: "FGakc6C75caW7hRRn_0lZ",
      name: "deep-nested-page",
      title: "deep-nested-page",
      meta: { description: "" },
      rootInstanceId: "P_qm1M69qwe6M2aaNBzOH",
      path: "/blog/page/deep-nested-page",
    },
  ],
  page: {
    id: "FGakc6C75caW7hRRn_0lZ",
    name: "deep-nested-page",
    title: "deep-nested-page",
    meta: { description: "" },
    rootInstanceId: "P_qm1M69qwe6M2aaNBzOH",
    path: "/blog/page/deep-nested-page",
  },
  assets: [
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
