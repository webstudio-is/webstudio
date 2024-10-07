import { InvalidValue } from "@webstudio-is/css-engine";
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
import type {} from "../../controls";
import { useStore } from "@nanostores/react";
import { $assets } from "~/shared/nano-states";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { parseCssFragment } from "../../shared/parse-css-fragment";
import { useComputedStyleDecl } from "../../shared/model";
import {
  getRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";

type IntermediateValue = {
  type: "intermediate";
  value: string;
};

const isAbsoluteURL = (value: string) => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

export const BackgroundImage = ({ index }: { index: number }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const assets = useStore($assets);
  const styleDecl = useComputedStyleDecl("backgroundImage");
  const styleValue = getRepeatedStyleItem(styleDecl, index);
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

    const parsed = parseCssFragment(value, "background");
    const newValue = parsed.get("backgroundImage");

    if (newValue === undefined || newValue?.type === "invalid") {
      setIntermediateValue({
        type: "invalid",
        value: value,
      });
      return;
    }

    const [layer] = newValue.type === "layers" ? newValue.value : [newValue];
    if (layer?.type === "keyword") {
      setIntermediateValue(undefined);
      setRepeatedStyleItem(styleDecl, index, layer, options);
    }
    if (layer?.type !== "image" || layer.value.type !== "url") {
      setIntermediateValue({
        type: "invalid",
        value: value,
      });
      return;
    }
    const url = layer.value.url;

    if (isAbsoluteURL(url) === true) {
      setRepeatedStyleItem(styleDecl, index, layer, options);
    } else {
      const usedAsset = Array.from($assets.get().values()).find(
        (asset) => asset.type === "image" && asset.name === url
      );

      if (usedAsset === undefined) {
        setErrors([`Asset ${url} is not found in project `]);
        setIntermediateValue({
          type: "invalid",
          value: value,
        });
        return;
      }

      setErrors([]);
      setRepeatedStyleItem(
        styleDecl,
        index,
        {
          type: "image",
          value: { type: "asset", value: usedAsset.id },
        },
        options
      );
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
          onBlur={() => {
            if (intermediateValue !== undefined) {
              handleChange(intermediateValue.value, { isEphemeral: false });
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && intermediateValue !== undefined) {
              handleChange(intermediateValue.value, { isEphemeral: false });
              event.preventDefault();
            }
          }}
        />
      </InputErrorsTooltip>
    </Flex>
  );
};
