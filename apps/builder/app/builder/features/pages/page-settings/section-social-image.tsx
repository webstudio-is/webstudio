import { useId } from "react";
import { useStore } from "@nanostores/react";
import { z } from "zod";
import {
  Button,
  Grid,
  InputErrorsTooltip,
  InputField,
  Text,
} from "@webstudio-is/design-system";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import { computeExpression } from "@webstudio-is/project-build/runtime/data";
import { ImageControl } from "~/shared/project-settings";
import { $assets } from "~/shared/sync/data-stores";
import { isLiteralExpression } from "@webstudio-is/sdk";
import { $pageRootScope } from "../page-utils";
import { ImageInfo } from "../image-info";
import { SocialPreview } from "../social-preview";
import { usePageUrl, type Errors, type OnChange, type Values } from "./shared";

const socialImageValues = z.object({
  socialImageUrl: z.string().optional(),
});

export const validateSocialImageSection = (
  values: Values,
  variableValues: Map<string, unknown>
): Errors => {
  const parsedResult = socialImageValues.safeParse({
    socialImageUrl: computeExpression(values.socialImageUrl, variableValues),
  });
  return parsedResult.success ? {} : parsedResult.error.formErrors.fieldErrors;
};

export const SocialImageSection = ({
  values,
  errors,
  disabled = false,
  showBindingControls = true,
  onChange,
}: {
  values: Values;
  errors: Errors;
  disabled?: boolean;
  showBindingControls?: boolean;
  onChange: OnChange;
}) => {
  const socialImageAssetButtonId = useId();
  const assets = useStore($assets);
  const socialImageAsset = assets.get(values.socialImageAssetId);
  const { variableValues, scope, aliases } = useStore($pageRootScope);
  const socialImageUrl = String(
    computeExpression(values.socialImageUrl, variableValues)
  );
  const pageUrl = usePageUrl(values);
  const title = String(computeExpression(values.title, variableValues));
  const description = String(
    computeExpression(values.description, variableValues)
  );
  return (
    <Grid gap={2}>
      <Text color="subtle">
        This image appears when you share a link to this page on social media
        sites. If no image is set here, the social image set in the project
        settings will be used. The optimal dimensions for the image are 1200x630
        px or larger with a 1.91:1 aspect ratio.
      </Text>
      <BindingControl>
        {showBindingControls && (
          <BindingPopover
            scope={scope}
            aliases={aliases}
            variant={
              isLiteralExpression(values.socialImageUrl) ? "default" : "bound"
            }
            value={values.socialImageUrl}
            onChange={(value) => {
              onChange({
                field: "socialImageUrl",
                value,
              });
            }}
            onRemove={(evaluatedValue) => {
              onChange({
                field: "socialImageUrl",
                value: JSON.stringify(evaluatedValue ?? ""),
              });
            }}
          />
        )}
        <InputErrorsTooltip errors={errors.socialImageUrl}>
          <InputField
            placeholder="https://www.url.com"
            disabled={
              disabled || isLiteralExpression(values.socialImageUrl) === false
            }
            color={errors.socialImageUrl && "error"}
            value={socialImageUrl}
            onChange={(event) => {
              onChange({
                field: "socialImageUrl",
                value: JSON.stringify(event.target.value),
              });
              onChange({ field: "socialImageAssetId", value: "" });
            }}
          />
        </InputErrorsTooltip>
      </BindingControl>
      <Grid gap={1} flow={"column"}>
        <ImageControl
          onAssetIdChange={(socialImageAssetId) => {
            onChange({
              field: "socialImageAssetId",
              value: socialImageAssetId,
            });
            onChange({ field: "socialImageUrl", value: "" });
          }}
        >
          <Button
            id={socialImageAssetButtonId}
            css={{ justifySelf: "start" }}
            color="neutral"
            disabled={disabled}
          >
            Choose image from assets
          </Button>
        </ImageControl>
      </Grid>

      {socialImageAsset?.type === "image" && (
        <ImageInfo
          asset={socialImageAsset}
          disabled={disabled}
          onDelete={() => {
            onChange({
              field: "socialImageAssetId",
              value: "",
            });
          }}
        />
      )}
      <div />
      <SocialPreview
        ogImageUrl={
          socialImageAsset?.type === "image"
            ? socialImageAsset.name
            : socialImageUrl
        }
        ogUrl={pageUrl}
        ogTitle={title}
        ogDescription={description}
      />
    </Grid>
  );
};
