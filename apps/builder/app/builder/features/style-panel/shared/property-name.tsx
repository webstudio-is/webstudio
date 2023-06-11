import { useState, type ReactElement, type MouseEventHandler } from "react";
import { useStore } from "@nanostores/react";
import type { StyleProperty } from "@webstudio-is/css-data";
import { createCssEngine } from "@webstudio-is/css-engine";
import {
  theme,
  Button,
  Flex,
  Label,
  Tooltip,
  Text,
} from "@webstudio-is/design-system";
import { ResetIcon } from "@webstudio-is/icons";
import { selectedInstanceSelectorStore } from "~/shared/nano-states";
import { type StyleInfo, type StyleSource, getStyleSource } from "./style-info";
import { humanizeString } from "~/shared/string-utils";
import { useInstanceStyleData } from "./style-info";

const TooltipContent = ({
  title,
  properties,
  description,
  style,
  styleSource,
  onReset,
  onClose,
}: {
  title: string;
  description: string;
  properties: StyleProperty[];
  style: StyleInfo;
  styleSource: StyleSource;
  onReset: () => void;
  onClose: () => void;
}) => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const instanceStyle = useInstanceStyleData(selectedInstanceSelector);
  const instanceStyleReduced = { ...instanceStyle };
  let property: StyleProperty;
  for (property in instanceStyle) {
    if (properties.includes(property) === false) {
      delete instanceStyleReduced[property];
    }
  }
  // @todo consider reusing CssPreview component
  const cssEngine = createCssEngine();
  const rule = cssEngine.addStyleRule("instance", {
    style: instanceStyleReduced,
  });
  const cssText = rule.styleMap.toString();
  const handlePreventDefault: MouseEventHandler = (event) => {
    // Prevent closing tooltip
    event.preventDefault();
  };

  return (
    <Flex direction="column" gap="2" css={{ maxWidth: theme.spacing[28] }}>
      <Text variant="titles">{title}</Text>
      <Text
        variant="monoBold"
        css={{ color: theme.colors.foregroundMoreSubtle }}
      >
        {cssText}
      </Text>
      {description && <Text>{description}</Text>}
      {styleSource === "local" && (
        <Button
          color="dark"
          prefix={<ResetIcon />}
          css={{ flexGrow: 1 }}
          onMouseDown={handlePreventDefault}
          onClickCapture={() => {
            onReset();
            onClose();
          }}
        >
          Reset value
        </Button>
      )}
    </Flex>
  );
};

type PropertyNameProps = {
  style: StyleInfo;
  property: StyleProperty | readonly StyleProperty[];
  label: string | ReactElement;
  onReset: () => void;
};

export const PropertyName = ({
  style,
  property,
  label,
  onReset,
}: PropertyNameProps) => {
  const isMultiple = Array.isArray(property);
  const properties = isMultiple ? property : [property];
  const styleSource = getStyleSource(
    ...properties.map((property) => style[property])
  );
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Flex align="center">
      <Tooltip
        open={isOpen}
        onOpenChange={setIsOpen}
        content={
          <TooltipContent
            title={isMultiple ? "@todo" : humanizeString(property as string)}
            description="The text will not wrap (break to the next line) if it overflows the container."
            properties={properties}
            style={style}
            styleSource={styleSource}
            onReset={onReset}
            onClose={() => {
              setIsOpen(false);
            }}
          />
        }
      >
        <Flex
          shrink
          gap={1}
          align="center"
          onClick={() => {
            setIsOpen(true);
          }}
        >
          {typeof label === "string" ? (
            <Label color={styleSource} truncate>
              {label}
            </Label>
          ) : (
            label
          )}
        </Flex>
      </Tooltip>
    </Flex>
  );
};
