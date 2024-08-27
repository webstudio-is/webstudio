import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { useMemo, useState } from "react";
import { ResetIcon } from "@webstudio-is/icons";
import {
  hyphenateProperty,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import {
  Button,
  Flex,
  Kbd,
  Label,
  Text,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import {
  $breakpoints,
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $styleSources,
} from "~/shared/nano-states";
import { getInstanceLabel } from "~/shared/instance-utils";
import type {
  ComputedStyleDecl,
  StyleValueSourceColor,
} from "~/shared/style-object-model";
import { createComputedStyleDeclStore } from "./shared/model";
import { StyleSourceBadge } from "./style-source";
import { useStyleData } from "./shared/use-style-data";

export const PropertyInfo = ({
  title,
  description,
  styles,
  onReset,
}: {
  title: string;
  description: string;
  styles: ComputedStyleDecl[];
  onReset: () => void;
}) => {
  const breakpoints = useStore($breakpoints);
  const instances = useStore($instances);
  const styleSources = useStore($styleSources);
  const metas = useStore($registeredComponentMetas);

  let resettable = false;
  const properties: string[] = [];
  const breakpointSet = new Set<string>();
  const styleSourceNameSet = new Set<string>();
  const instanceSet = new Set<string>();

  for (const { property, source } of styles) {
    if (source.name === "local" || source.name === "overwritten") {
      resettable = true;
    }
    properties.push(hyphenateProperty(property));
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
        {properties.join("\n")}
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
  const instanceSelector = useStore($selectedInstanceSelector);
  const { createBatchUpdate } = useStyleData(instanceSelector?.[0] ?? "");
  const $styles = useMemo(() => {
    return computed(
      properties.map(createComputedStyleDeclStore),
      (...computedStyles) => computedStyles
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, properties);
  const styles = useStore($styles);
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
