import type { InvalidValue, StyleValue } from "@webstudio-is/css-engine";
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
import { useRef, useState } from "react";
import type {} from "../../controls";
import { $assets } from "~/shared/nano-states";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { InfoCircleIcon } from "@webstudio-is/icons";
import { parseCssFragment } from "../../shared/css-fragment";
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

const getInitialErrors = (styleValue: StyleValue | undefined): string[] => {
  const assets = $assets.get();
  if (styleValue === undefined) {
    return [];
  }
  if (styleValue.type === "image") {
    if (styleValue.value.type === "asset") {
      const asset = assets.get(styleValue.value.value);
      if (asset === undefined || asset.type !== "image") {
        return [`Asset ${styleValue.value.value} is not found in project`];
      }
    }
  }
  return [];
};

const getInitialValue = (
  styleValue: StyleValue | undefined
): IntermediateValue | InvalidValue | undefined => {
  const assets = $assets.get();

  if (styleValue === undefined) {
    return;
  }

  if (styleValue.type === "keyword") {
    return {
      type: "intermediate",
      value: styleValue.value,
    };
  }

  let backgroundUrl;
  if (styleValue.type === "image") {
    if (styleValue.value.type === "asset") {
      const asset = assets.get(styleValue.value.value);
      if (asset === undefined || asset.type !== "image") {
        return {
          type: "invalid",
          value: styleValue.value.value,
        };
      }
      backgroundUrl = `url(${asset.name})`;
    }

    if (styleValue.value.type === "url") {
      backgroundUrl = `url(${styleValue.value.url})`;
    }

    return backgroundUrl !== undefined
      ? { type: "intermediate", value: backgroundUrl }
      : undefined;
  }
};

export const BackgroundImage = ({ index }: { index: number }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const styleDecl = useComputedStyleDecl("background-image");
  const styleValue = getRepeatedStyleItem(styleDecl, index);
  const [errors, setErrors] = useState<string[]>(() =>
    getInitialErrors(styleValue)
  );
  const [intermediateValue, setIntermediateValue] = useState<
    IntermediateValue | InvalidValue | undefined
  >(() => getInitialValue(styleValue));

  const handleChange = (value: string, options: StyleUpdateOptions) => {
    setIntermediateValue({
      type: "intermediate",
      value: value,
    });

    const parsed = parseCssFragment(value, ["background-image", "background"]);
    const newValue = parsed.get("background-image");

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
        padding: theme.panel.padding,
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
