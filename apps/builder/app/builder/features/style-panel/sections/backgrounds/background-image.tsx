import { InvalidValue, type StyleProperty } from "@webstudio-is/css-engine";
import {
  TextArea,
  textVariants,
  Flex,
  theme,
  InputErrorsTooltip,
  Label,
  Tooltip,
  Text,
} from "@webstudio-is/design-system";
import { useRef, useState, useEffect } from "react";
import type { ControlProps } from "../../controls";
import { useStore } from "@nanostores/react";
import { $assets } from "~/shared/nano-states";
import { parseCssValue } from "@webstudio-is/css-data";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { InfoCircleIcon } from "@webstudio-is/icons";

const property: StyleProperty = "backgroundImage";

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

const extractUrlFromValue = (cssValue: string) => {
  const regex = /url\(["']?(.*?)["']?\)/;
  const match = cssValue.match(regex);
  return match ? match[1] : undefined;
};

const isAbsoluteURL = (value: string) => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

export const BackgroundImage = (
  props: Omit<ControlProps, "property" | "items">
) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const assets = useStore($assets);
  const styleValue = props.currentStyle[property]?.value;
  const [errors, setErrors] = useState<string[]>([]);
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateValue | InvalidValue | undefined
  >(undefined);

  useEffect(() => {
    if (styleValue === undefined) {
      return;
    }

    if (styleValue.type === "keyword") {
      setIntermediateValue({
        type: "intermediate",
        value: styleValue.value,
      });
    }

    let backgroundUrl;
    if (styleValue.type === "image") {
      if (styleValue.value.type === "asset") {
        const asset = assets.get(styleValue.value.value);
        if (asset === undefined || asset.type !== "image") {
          setErrors(["Asset not found"]);
          setIntermediateValue({
            type: "invalid",
            value: styleValue.value.value,
          });
          return;
        }
        backgroundUrl = `url(${asset.name})`;
      }

      if (styleValue.value.type === "url") {
        backgroundUrl = `url(${styleValue.value.url})`;
      }

      setIntermediateValue(
        backgroundUrl !== undefined
          ? { type: "intermediate", value: backgroundUrl }
          : undefined
      );
    }
  }, [styleValue, assets]);

  const handleChange = (value: string, options: StyleUpdateOptions) => {
    setIntermediateValue({
      type: "intermediate",
      value: value,
    });

    const newValue = parseCssValue(property, value);
    if (newValue.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: value,
      });
      return;
    }

    if (newValue.type === "unparsed") {
      const urlFromProperty = extractUrlFromValue(value);
      if (urlFromProperty === undefined) {
        setIntermediateValue({
          type: "invalid",
          value: value,
        });
        return;
      }

      if (isAbsoluteURL(urlFromProperty) === true) {
        props.setProperty(property)(
          {
            type: "image",
            value: {
              type: "url",
              url: urlFromProperty,
            },
          },
          options
        );
      } else {
        const usedAsset = Array.from($assets.get().values()).find(
          (asset) => asset.type === "image" && asset.name === urlFromProperty
        );

        if (usedAsset === undefined) {
          setErrors([`Asset ${urlFromProperty} is not found in project `]);
          setIntermediateValue({
            type: "invalid",
            value: value,
          });
          return;
        }

        setErrors([]);
        props.setProperty(property)(
          {
            type: "image",
            value: {
              type: "asset",
              value: usedAsset.id,
            },
          },
          options
        );
      }
    }
  };

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
      <Label>
        <Flex align="center" gap="1">
          Code
          <Tooltip
            variant="wrapped"
            content={
              <Text>
                Paste a background-image CSS property value here. You can use
                the URL of an asset in your project or an external URL.
                <br /> <br />
                <Text variant="monoBold">url("image.jpg")</Text>
              </Text>
            }
          >
            <InfoCircleIcon />
          </Tooltip>
        </Flex>
      </Label>

      <InputErrorsTooltip errors={errors}>
        <TextArea
          ref={textAreaRef}
          css={{ ...textVariants.mono }}
          rows={2}
          autoGrow
          maxRows={4}
          name="description"
          color={intermediateValue?.type === "invalid" ? "error" : undefined}
          value={intermediateValue !== undefined ? intermediateValue.value : ""}
          onChange={(value) => handleChange(value, { isEphemeral: true })}
          onKeyDown={(event) => {
            if (event.key === "Enter" && intermediateValue !== undefined) {
              handleChange(intermediateValue.value, { isEphemeral: false });
              event.preventDefault();
            }

            if (event.key === "Escape") {
              props.deleteProperty(property, { isEphemeral: true });
              setIntermediateValue(undefined);
              event.preventDefault();
            }
          }}
        />
      </InputErrorsTooltip>
    </Flex>
  );
};
