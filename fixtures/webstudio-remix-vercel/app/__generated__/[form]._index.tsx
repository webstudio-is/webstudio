/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import {
  Body as Body,
  Form as Form,
} from "@webstudio-is/sdk-components-react-remix";
import {
  Box as Box,
  Label as Label,
  Input as Input,
  Button as Button,
  Heading as Heading,
} from "@webstudio-is/sdk-components-react";

export const siteName = "KittyGuardedZone";

export const favIconAsset: ImageAsset | undefined = {
  id: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
  name: "DALL_E_2023-10-30_12.39.46_-_Photo_logo_with_a_bold_cat_silhouette_centered_on_a_contrasting_background_designed_for_clarity_at_small_32x32_favicon_resolution_00h6cEA8u2pJRvVJv7hRe.png",
  description: null,
  projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
  size: 268326,
  type: "image",
  format: "png",
  createdAt: "2023-10-30T13:51:08.416+00:00",
  meta: { width: 790, height: 786 },
};

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Page = ({}: { system: any }) => {
  let [formState, set$formState] = useVariableState<any>("initial");
  let [formState_1, set$formState_1] = useVariableState<any>("initial");
  return (
    <Body className={`w-body`}>
      <Form
        state={formState}
        onStateChange={(state: any) => {
          formState = state;
          set$formState(formState);
        }}
        className={`w-webhook-form`}
      >
        {(formState === "initial" || formState === "error") && (
          <Box className={`w-box`}>
            <Heading tag={"h3"} className={`w-heading`}>
              {"Default form"}
            </Heading>
            <Label className={`w-input-label`}>{"Name"}</Label>
            <Input name={"name"} className={`w-text-input`} />
            <Label className={`w-input-label`}>{"Email"}</Label>
            <Input name={"email"} className={`w-text-input`} />
            <Button className={`w-button`}>{"Submit"}</Button>
          </Box>
        )}
        {formState === "success" && (
          <Box className={`w-box`}>{"Thank you for getting in touch!"}</Box>
        )}
        {formState === "error" && (
          <Box className={`w-box`}>{"Sorry, something went wrong."}</Box>
        )}
      </Form>
      <Form
        state={formState_1}
        onStateChange={(state: any) => {
          formState_1 = state;
          set$formState_1(formState_1);
        }}
        action={"action"}
        className={`w-webhook-form`}
      >
        {(formState_1 === "initial" || formState_1 === "error") && (
          <Box className={`w-box`}>
            <Heading tag={"h3"} className={`w-heading`}>
              {"Form with custom action and method"}
            </Heading>
            <Label className={`w-input-label`}>{"Name"}</Label>
            <Input name={"name"} className={`w-text-input`} />
            <Label className={`w-input-label`}>{"Email"}</Label>
            <Input name={"email"} className={`w-text-input`} />
            <Button className={`w-button`}>{"Submit"}</Button>
          </Box>
        )}
        {formState_1 === "success" && (
          <Box className={`w-box`}>{"Thank you for getting in touch!"}</Box>
        )}
        {formState_1 === "error" && (
          <Box className={`w-box`}>{"Sorry, something went wrong."}</Box>
        )}
      </Form>
    </Body>
  );
};

export { Page };
