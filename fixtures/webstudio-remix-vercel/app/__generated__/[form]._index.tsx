/* eslint-disable */
/* This is a auto generated file for building the project */

import { type ReactNode, useState } from "react";
import type { PageData } from "~/routes/_index";
import type { Asset } from "@webstudio-is/sdk";
import {
  Body as Body,
  Box as Box,
  Label as Label,
  Input as Input,
  Button as Button,
  Heading as Heading,
} from "@webstudio-is/sdk-components-react";
import { Form as Form } from "@webstudio-is/sdk-components-react-remix";

export const fontAssets: Asset[] = [];
export const pageData: PageData = {
  build: {
    props: [
      [
        "OER1GvKVEE4CdEX1yrNe3",
        {
          id: "OER1GvKVEE4CdEX1yrNe3",
          instanceId: "isNSM3wXcnHFikwNPlEOL",
          name: "state",
          type: "dataSource",
          value: "KvfuNNCNslj7nAGsD69Fl",
        },
      ],
      [
        "RHHw5ACTgdDO751J8CgWB",
        {
          id: "RHHw5ACTgdDO751J8CgWB",
          instanceId: "isNSM3wXcnHFikwNPlEOL",
          name: "onStateChange",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["state"],
              code: "$ws$dataSource$KvfuNNCNslj7nAGsD69Fl = state",
            },
          ],
        },
      ],
      [
        "Nyxr4ohgm_MNVtGpsGUn3",
        {
          id: "Nyxr4ohgm_MNVtGpsGUn3",
          instanceId: "a5YPRc19IJyhTrjjasA_R",
          name: "data-ws-show",
          type: "dataSource",
          value: "ezyBm7JGcDokMP8DZVzrD",
        },
      ],
      [
        "3tFb2mZpmJXG5txK78S9g",
        {
          id: "3tFb2mZpmJXG5txK78S9g",
          instanceId: "ydR5B_9uMS4PXFS76TmBh",
          name: "name",
          type: "string",
          value: "name",
        },
      ],
      [
        "7L7d7raf6WNI4_velVRy3",
        {
          id: "7L7d7raf6WNI4_velVRy3",
          instanceId: "TsqGP49hjgEW41ReCwrpZ",
          name: "name",
          type: "string",
          value: "email",
        },
      ],
      [
        "mtOiOi1u0WbNI09rVIS6T",
        {
          id: "mtOiOi1u0WbNI09rVIS6T",
          instanceId: "Gw-ta0R4FNFAGBTVRWKep",
          name: "data-ws-show",
          type: "dataSource",
          value: "_NmOL-v4PZhCcmj2vaDy_",
        },
      ],
      [
        "FTd65V4oEibesTqvAjKp0",
        {
          id: "FTd65V4oEibesTqvAjKp0",
          instanceId: "ewk_WKpu4syHLPABMmvUz",
          name: "data-ws-show",
          type: "dataSource",
          value: "VeQ-Tiya3whVhWHbJVHID",
        },
      ],
      [
        "vtsKrdjJH3YT89prj2K5T",
        {
          id: "vtsKrdjJH3YT89prj2K5T",
          instanceId: "-1RvizaBcVpHsjvnYxn1c",
          name: "state",
          type: "dataSource",
          value: "Ip0FRY7L24QrIMdtuMN5j",
        },
      ],
      [
        "E2n44qWixMBKO6m8kg1wp",
        {
          id: "E2n44qWixMBKO6m8kg1wp",
          instanceId: "-1RvizaBcVpHsjvnYxn1c",
          name: "onStateChange",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["state"],
              code: "$ws$dataSource$Ip0FRY7L24QrIMdtuMN5j = state",
            },
          ],
        },
      ],
      [
        "K6DEgf4WkIDqdiuiwAS5E",
        {
          id: "K6DEgf4WkIDqdiuiwAS5E",
          instanceId: "qhnVrmYGlyrMZi3UzqSQA",
          name: "data-ws-show",
          type: "dataSource",
          value: "DUDDZM-QmYH_zBgbIODiu",
        },
      ],
      [
        "kWwLbf7GOo7-n4xOi8nZi",
        {
          id: "kWwLbf7GOo7-n4xOi8nZi",
          instanceId: "e035xi9fcwYtrn9La49Eh",
          name: "name",
          type: "string",
          value: "name",
        },
      ],
      [
        "dnX31oCvPdAPBQ1JqbnXr",
        {
          id: "dnX31oCvPdAPBQ1JqbnXr",
          instanceId: "dcHjdeW_HXPkyQlx3ZiL7",
          name: "name",
          type: "string",
          value: "email",
        },
      ],
      [
        "JbdIh72OZ8RnHXvYTsLRd",
        {
          id: "JbdIh72OZ8RnHXvYTsLRd",
          instanceId: "966cjxuqP_T99N27-mqWE",
          name: "data-ws-show",
          type: "dataSource",
          value: "F72Gu_6DnbW9CGp_747xa",
        },
      ],
      [
        "6UMH0WLK_fORElv3ffHCg",
        {
          id: "6UMH0WLK_fORElv3ffHCg",
          instanceId: "SYG5hhOz31xFJUN_v9zq6",
          name: "data-ws-show",
          type: "dataSource",
          value: "XhDObB85P8I_uDZ_CzGDt",
        },
      ],
      [
        "cpfLtqW20MR6y68u70Ta2",
        {
          id: "cpfLtqW20MR6y68u70Ta2",
          instanceId: "isNSM3wXcnHFikwNPlEOL",
          name: "method",
          type: "string",
          value: "get",
        },
      ],
      [
        "d5fWTvwp-dtCYQ0rleaQ0",
        {
          id: "d5fWTvwp-dtCYQ0rleaQ0",
          instanceId: "isNSM3wXcnHFikwNPlEOL",
          name: "action",
          type: "string",
          value: "/custom",
        },
      ],
      [
        "Oe1u15XWPgU6oBGnrmT5E",
        {
          id: "Oe1u15XWPgU6oBGnrmT5E",
          instanceId: "y4pceTmziuBRIDgUBQNLD",
          name: "tag",
          type: "string",
          value: "h3",
        },
      ],
      [
        "-QA9iF6dEVIibtNCO1EQp",
        {
          id: "-QA9iF6dEVIibtNCO1EQp",
          instanceId: "YdHHf4u3jrdbRIWpB_VfH",
          name: "tag",
          type: "string",
          value: "h3",
        },
      ],
    ],
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
    {
      id: "U1tRJl2ERr8_OFe0g9cN_",
      name: "form",
      title: "form",
      meta: { description: "" },
      rootInstanceId: "a-4nDFkaWy4px1fn38XWJ",
      path: "/form",
    },
    {
      id: "-J9I4Oo6mONfQlf_3-OqG",
      name: "heading-with-id",
      title: "heading-with-id",
      meta: { description: "" },
      rootInstanceId: "O-ljaGZQ0iRNTlEshMkgE",
      path: "/heading-with-id",
    },
  ],
  page: {
    id: "U1tRJl2ERr8_OFe0g9cN_",
    name: "form",
    title: "form",
    meta: { description: "" },
    rootInstanceId: "a-4nDFkaWy4px1fn38XWJ",
    path: "/form",
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

const Page = (props: { scripts?: ReactNode }) => {
  let [formState, set$formState] = useState<any>("initial");
  let [formState_1, set$formState_1] = useState<any>("initial");
  let formInitial = formState === "initial" || formState === "error";
  let formSuccess = formState === "success";
  let formError = formState === "error";
  let formInitial_1 = formState_1 === "initial" || formState_1 === "error";
  let formSuccess_1 = formState_1 === "success";
  let formError_1 = formState_1 === "error";
  let onStateChange = (state: any) => {
    formState = state;
    set$formState(formState);
  };
  let onStateChange_1 = (state: any) => {
    formState_1 = state;
    set$formState_1(formState_1);
  };
  return (
    <Body data-ws-id="a-4nDFkaWy4px1fn38XWJ" data-ws-component="Body">
      <Form
        data-ws-id="-1RvizaBcVpHsjvnYxn1c"
        data-ws-component="Form"
        state={formState_1}
        onStateChange={onStateChange_1}
      >
        {formInitial_1 && (
          <Box data-ws-id="qhnVrmYGlyrMZi3UzqSQA" data-ws-component="Box">
            <Heading
              data-ws-id="YdHHf4u3jrdbRIWpB_VfH"
              data-ws-component="Heading"
              tag={"h3"}
            >
              {"Default form"}
            </Heading>
            <Label data-ws-id="A0RNI1WVwOGGDbwYnoZia" data-ws-component="Label">
              {"Name"}
            </Label>
            <Input
              data-ws-id="e035xi9fcwYtrn9La49Eh"
              data-ws-component="Input"
              name={"name"}
            />
            <Label data-ws-id="LImtuVzw5R9yQsG4faiGV" data-ws-component="Label">
              {"Email"}
            </Label>
            <Input
              data-ws-id="dcHjdeW_HXPkyQlx3ZiL7"
              data-ws-component="Input"
              name={"email"}
            />
            <Button
              data-ws-id="ZAtG6JgK4sbTnOAZlp2rU"
              data-ws-component="Button"
            >
              {"Submit"}
            </Button>
          </Box>
        )}
        {formSuccess_1 && (
          <Box data-ws-id="966cjxuqP_T99N27-mqWE" data-ws-component="Box">
            {"Thank you for getting in touch!"}
          </Box>
        )}
        {formError_1 && (
          <Box data-ws-id="SYG5hhOz31xFJUN_v9zq6" data-ws-component="Box">
            {"Sorry, something went wrong."}
          </Box>
        )}
      </Form>
      <Form
        data-ws-id="isNSM3wXcnHFikwNPlEOL"
        data-ws-component="Form"
        state={formState}
        onStateChange={onStateChange}
        method={"get"}
        action={"/custom"}
      >
        {formInitial && (
          <Box data-ws-id="a5YPRc19IJyhTrjjasA_R" data-ws-component="Box">
            <Heading
              data-ws-id="y4pceTmziuBRIDgUBQNLD"
              data-ws-component="Heading"
              tag={"h3"}
            >
              {"Form with custom action and method"}
            </Heading>
            <Label data-ws-id="_gLjS0enBOV8KW9Ykz_es" data-ws-component="Label">
              {"Name"}
            </Label>
            <Input
              data-ws-id="ydR5B_9uMS4PXFS76TmBh"
              data-ws-component="Input"
              name={"name"}
            />
            <Label data-ws-id="8RU1FyL2QRyqhNUKELGrb" data-ws-component="Label">
              {"Email"}
            </Label>
            <Input
              data-ws-id="TsqGP49hjgEW41ReCwrpZ"
              data-ws-component="Input"
              name={"email"}
            />
            <Button
              data-ws-id="5GWjwVdapuGdn443GIKDW"
              data-ws-component="Button"
            >
              {"Submit"}
            </Button>
          </Box>
        )}
        {formSuccess && (
          <Box data-ws-id="Gw-ta0R4FNFAGBTVRWKep" data-ws-component="Box">
            {"Thank you for getting in touch!"}
          </Box>
        )}
        {formError && (
          <Box data-ws-id="ewk_WKpu4syHLPABMmvUz" data-ws-component="Box">
            {"Sorry, something went wrong."}
          </Box>
        )}
      </Form>
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
>([["isNSM3wXcnHFikwNPlEOL", { method: "get", action: "/custom" }]]);
