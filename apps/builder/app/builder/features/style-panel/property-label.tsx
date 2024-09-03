import { useStore } from "@nanostores/react";
import { useState, type ReactNode } from "react";
import { AlertIcon, ResetIcon } from "@webstudio-is/icons";
import {
  hyphenateProperty,
  toValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import {
  Button,
  Flex,
  Kbd,
  Label,
  rawTheme,
  SectionTitleLabel,
  Text,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import {
  $breakpoints,
  $instances,
  $registeredComponentMetas,
  $styleSources,
} from "~/shared/nano-states";
import { getInstanceLabel } from "~/shared/instance-utils";
import type {
  ComputedStyleDecl,
  StyleValueSourceColor,
} from "~/shared/style-object-model";
import { useComputedStyles } from "./shared/model";
import { StyleSourceBadge } from "./style-source";
import { createBatchUpdate } from "./shared/use-style-data";

const renderCss = (styles: ComputedStyleDecl[]) => {
  let css = "";
  for (const computedStyleDecl of styles) {
    const property = hyphenateProperty(computedStyleDecl.property);
    const value = toValue(computedStyleDecl.cascadedValue);
    css += `${property}: ${value};\n`;
  }
  return css.trimEnd();
};

export const PropertyInfo = ({
  title,
  code,
  description,
  styles,
  onReset,
}: {
  title: string;
  code?: string;
  description: ReactNode;
  styles: ComputedStyleDecl[];
  onReset: () => void;
}) => {
  const breakpoints = useStore($breakpoints);
  const instances = useStore($instances);
  const styleSources = useStore($styleSources);
  const metas = useStore($registeredComponentMetas);

  let resettable = false;
  const breakpointSet = new Set<string>();
  const styleSourceNameSet = new Set<string>();
  const instanceSet = new Set<string>();

  for (const { source } of styles) {
    if (source.name === "local" || source.name === "overwritten") {
      resettable = true;
    }
    const instance = source.instanceId
      ? instances.get(source.instanceId)
      : undefined;
    if (instance === undefined) {
      continue;
    }
    const meta = metas.get(instance.component);
    const styleSource = source.styleSourceId
      ? styleSources.get(source.styleSourceId)
      : undefined;
    const breakpoint = source.breakpointId
      ? breakpoints.get(source.breakpointId)
      : undefined;
    if (styleSource) {
      const styleSourceName =
        styleSource.type === "token" ? styleSource.name : "Local";
      if (source.state) {
        const stateLabel =
          meta?.states?.find((item) => item.selector === source.state)?.label ??
          humanizeString(source.state);
        styleSourceNameSet.add(`${styleSourceName} (${stateLabel})`);
      } else {
        styleSourceNameSet.add(styleSourceName);
      }
    }
    if (breakpoint) {
      breakpointSet.add(
        breakpoint?.minWidth?.toString() ??
          breakpoint?.maxWidth?.toString() ??
          "Base"
      );
    }
    if (instance && meta) {
      instanceSet.add(getInstanceLabel(instance, meta));
    }
  }

  return (
    <Flex direction="column" gap="2" css={{ maxWidth: theme.spacing[28] }}>
      <Text variant="titles">{title}</Text>
      <Text
        variant="monoBold"
        color="moreSubtle"
        userSelect="text"
        css={{ whiteSpace: "break-spaces", cursor: "text" }}
      >
        {code ?? renderCss(styles)}
      </Text>
      <Text>{description}</Text>
      {(styleSourceNameSet.size > 0 || instanceSet.size > 0) && (
        <Flex
          direction="column"
          gap="1"
          css={{ paddingBottom: theme.spacing[5] }}
        >
          <Text color="moreSubtle">Value comes from</Text>
          <Flex gap="1" wrap="wrap">
            {Array.from(breakpointSet).map((label) => (
              <StyleSourceBadge key={label} source="breakpoint" variant="small">
                {label}
              </StyleSourceBadge>
            ))}
            {Array.from(styleSourceNameSet).map((label) => (
              <StyleSourceBadge
                key={label}
                source={label === "Local" ? "local" : "token"}
                variant="small"
              >
                {label}
              </StyleSourceBadge>
            ))}
            {Array.from(instanceSet).map((label) => (
              <StyleSourceBadge key={label} source="instance" variant="small">
                {label}
              </StyleSourceBadge>
            ))}
          </Flex>
        </Flex>
      )}
      {resettable && (
        <Button
          color="dark"
          prefix={
            <Flex justify="end">
              <ResetIcon />
            </Flex>
          }
          suffix={<Kbd value={["option", "click"]} />}
          css={{ gridTemplateColumns: "2fr 3fr 1fr" }}
          onClick={onReset}
        >
          Reset value
        </Button>
      )}
    </Flex>
  );
};

const getPriorityStyleSource = (
  styleSources: StyleValueSourceColor[]
): StyleValueSourceColor => {
  const customOrder: StyleValueSourceColor[] = [
    "overwritten",
    "local",
    "remote",
    "preset",
    "default",
  ];
  for (const color of customOrder) {
    if (styleSources.includes(color)) {
      return color;
    }
  }
  return "default";
};

export const PropertyLabel = ({
  label,
  description,
  properties,
}: {
  label: string;
  description: string;
  properties: [StyleProperty, ...StyleProperty[]];
}) => {
  const styles = useComputedStyles(properties);
  const colors = styles.map(({ source }) => source.name);
  const styleValueSourceColor = getPriorityStyleSource(colors);
  const [isOpen, setIsOpen] = useState(false);
  const resetProperty = () => {
    const batch = createBatchUpdate();
    for (const property of properties) {
      batch.deleteProperty(property);
    }
    batch.publish();
  };
  return (
    <Flex align="center">
      <Tooltip
        open={isOpen}
        onOpenChange={setIsOpen}
        // prevent closing tooltip on content click
        onPointerDown={(event) => event.preventDefault()}
        triggerProps={{
          onClick: (event) => {
            if (event.altKey) {
              event.preventDefault();
              resetProperty();
              return;
            }
            setIsOpen(true);
          },
        }}
        content={
          <PropertyInfo
            title={label}
            description={description}
            styles={styles}
            onReset={() => {
              resetProperty();
              setIsOpen(false);
            }}
          />
        }
      >
        <Flex shrink gap={1} align="center">
          <Label color={styleValueSourceColor} truncate>
            {label}
          </Label>
        </Flex>
      </Tooltip>
    </Flex>
  );
};

export const PropertySectionLabel = ({
  label,
  description,
  properties,
}: {
  label: string;
  description: string;
  properties: [StyleProperty, ...StyleProperty[]];
}) => {
  const styles = useComputedStyles(properties);
  const colors = styles.map(({ source }) => source.name);
  const styleValueSourceColor = getPriorityStyleSource(colors);
  const [isOpen, setIsOpen] = useState(false);
  const resetProperty = () => {
    const batch = createBatchUpdate();
    for (const property of properties) {
      batch.deleteProperty(property);
    }
    batch.publish();
  };
  return (
    <Flex align="center">
      <Tooltip
        open={isOpen}
        onOpenChange={setIsOpen}
        // prevent closing tooltip on content click
        onPointerDown={(event) => event.preventDefault()}
        triggerProps={{
          onClick: (event) => {
            if (event.altKey) {
              event.preventDefault();
              resetProperty();
              return;
            }
            setIsOpen(true);
          },
        }}
        content={
          <PropertyInfo
            title={label}
            description={description}
            styles={styles}
            onReset={() => {
              resetProperty();
              setIsOpen(false);
            }}
          />
        }
      >
        <Flex shrink gap={1} align="center">
          <SectionTitleLabel color={styleValueSourceColor}>
            {label}
          </SectionTitleLabel>
        </Flex>
      </Tooltip>
    </Flex>
  );
};

/**
 * Some properties like layered background-image, background-size are non resetable.
 * UI of background would be unreadable, imagine you have
 * background-size inherited from one source, background-image from the other,
 * Every property have different amount of layers. The final result on the screen would be a mess.
 */
export const PropertyInlineLabel = ({
  label,
  title,
  description,
  properties,
  disabled,
}: {
  label: string;
  title?: string;
  description: string;
  properties?: [StyleProperty, ...StyleProperty[]];
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Flex align="center">
      <Tooltip
        open={isOpen}
        onOpenChange={setIsOpen}
        // prevent closing tooltip on content click
        onPointerDown={(event) => event.preventDefault()}
        triggerProps={{
          onClick: () => setIsOpen(true),
        }}
        content={
          <>
            <Flex
              direction="column"
              gap="2"
              css={{ maxWidth: theme.spacing[28] }}
            >
              <Text variant="titles">{title ?? label}</Text>
              {properties && (
                <Text
                  variant="monoBold"
                  color="moreSubtle"
                  userSelect="text"
                  css={{ whiteSpace: "break-spaces", cursor: "text" }}
                >
                  {properties.map(hyphenateProperty).join("\n")}
                </Text>
              )}
              <Text>{description}</Text>
            </Flex>
          </>
        }
      >
        <Flex shrink gap={1} align="center">
          <Label color="default" disabled={disabled} truncate>
            {label}
          </Label>
        </Flex>
      </Tooltip>
    </Flex>
  );
};

export const PropertyValueTooltip = ({
  label,
  description,
  properties,
  isAdvanced,
  children,
}: {
  label: string;
  description: string;
  properties: [StyleProperty, ...StyleProperty[]];
  isAdvanced?: boolean;
  children: ReactNode;
}) => {
  const styles = useComputedStyles(properties);
  const [isOpen, setIsOpen] = useState(false);
  const resetProperty = () => {
    const batch = createBatchUpdate();
    for (const property of properties) {
      batch.deleteProperty(property);
    }
    batch.publish();
  };
  return (
    <Tooltip
      open={isOpen}
      onOpenChange={setIsOpen}
      // prevent closing tooltip on content click
      onPointerDown={(event) => event.preventDefault()}
      triggerProps={{
        onClick: (event) => {
          if (event.altKey) {
            event.preventDefault();
            resetProperty();
            return;
          }
        },
      }}
      content={
        <PropertyInfo
          title={label}
          description={
            <Flex gap="2" direction="column">
              {description}
              {isAdvanced && (
                <Flex gap="1">
                  <AlertIcon color={rawTheme.colors.backgroundAlertMain} /> This
                  value was defined in the Advanced section.
                </Flex>
              )}
            </Flex>
          }
          styles={styles}
          onReset={() => {
            resetProperty();
            setIsOpen(false);
          }}
        />
      }
    >
      {children}
    </Tooltip>
  );
};
