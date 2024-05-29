import { type StyleProperty } from "@webstudio-is/css-engine";
import {
  TextArea,
  textVariants,
  Flex,
  theme,
} from "@webstudio-is/design-system";
import { useRef } from "react";
import type { ControlProps } from "../../controls";
import { NonResetablePropertyName } from "../../shared/property-name";
import { useStore } from "@nanostores/react";
import { $assets } from "~/shared/nano-states";

const property: StyleProperty = "backgroundImage";

export const BackgroundImage = (
  props: Omit<ControlProps, "property" | "items">
) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const assets = useStore($assets);
  const styleValue = props.currentStyle[property]?.value;
  let propertyValue;

  if (styleValue?.type === "keyword") {
    propertyValue = styleValue.value;
  }

  if (styleValue?.type === "image" && styleValue.value.type === "asset") {
    const asset = assets.get(styleValue.value.value);
    if (asset === undefined || asset.type !== "image") {
      propertyValue = undefined;
      return;
    }

    propertyValue = `url("./${asset.name}")`;
  }

  return (
    <Flex
      direction="column"
      css={{
        gridColumn: "span 2",
        px: theme.spacing[9],
        paddingTop: theme.spacing[5],
        paddingBottom: theme.spacing[9],
        gap: theme.spacing[3],
      }}
    >
      <NonResetablePropertyName
        style={props.currentStyle}
        properties={[property]}
        label="Image"
      />
      <TextArea
        ref={textAreaRef}
        css={{ ...textVariants.mono }}
        rows={2}
        autoGrow
        maxRows={4}
        name="description"
        readOnly
        value={propertyValue ?? ""}
      />
    </Flex>
  );
};
