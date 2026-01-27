import type { StyleValue } from "@webstudio-is/css-engine";
import { Flex, theme, Grid, Box } from "@webstudio-is/design-system";
import { useRef, useCallback } from "react";
import { ImageControl } from "../../controls";
import { PropertyInlineLabel } from "../../property-label";
import { propertyDescriptions } from "@webstudio-is/css-data";
import { BackgroundCodeEditor } from "./background-code-editor";
import { $assets } from "~/shared/sync/data-stores";
import { isAbsoluteUrl } from "@webstudio-is/sdk";

export const BackgroundImage = ({ index }: { index: number }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  const handleValidate = useCallback(
    (_value: string, parsed: Map<string, StyleValue>) => {
      const newValue = parsed.get("background-image");

      if (newValue === undefined || newValue?.type === "invalid") {
        return undefined;
      }

      const [layer] = newValue.type === "layers" ? newValue.value : [newValue];

      // Only validate image URLs, not keywords or other types
      if (layer?.type !== "image" || layer.value.type !== "url") {
        return undefined;
      }

      const url = layer.value.url;

      // If it's an absolute URL, no validation needed
      if (isAbsoluteUrl(url)) {
        return undefined;
      }

      // Check if the asset exists in the project
      const usedAsset = Array.from($assets.get().values()).find(
        (asset) => asset.type === "image" && asset.name === url
      );

      if (usedAsset === undefined) {
        return [`Asset ${url} is not found in project`];
      }

      return undefined;
    },
    []
  );

  return (
    <Flex
      direction="column"
      gap={1}
      css={{ padding: theme.panel.padding }}
      ref={elementRef}
    >
      <Grid gap="2" columns="3" align="start">
        <PropertyInlineLabel
          label="Image"
          description={propertyDescriptions.backgroundImage}
        />
        <Box
          css={{ gridColumn: "span 2" }}
          ref={elementRef}
          data-floating-panel-container
        >
          <ImageControl property="background-image" index={index} />
        </Box>
      </Grid>
      <BackgroundCodeEditor index={index} onValidate={handleValidate} />
    </Flex>
  );
};
