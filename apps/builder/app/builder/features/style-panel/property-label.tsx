import { useStore } from "@nanostores/react";
import { useState, type ReactNode } from "react";
import { AlertIcon, ResetIcon } from "@webstudio-is/icons";
import { toValue, type CssProperty } from "@webstudio-is/css-engine";
import { propertiesData } from "@webstudio-is/css-data";
import {
  Button,
  cssVar,
  Flex,
  Kbd,
  ResettableLabel,
  SectionTitleLabel,
  Text,
  theme,
  Tooltip,
  IconLink,
} from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import {
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $selectedInstancePathWithRoot,
  $selectedBreakpointId,
  $selectedStyleState,
  $temporaryTagTokenId,
  selectInstance,
  $virtualInstances,
} from "~/shared/nano-states";
import { $breakpoints } from "~/shared/sync/data-stores";
import { $instances, $styleSources } from "~/shared/sync/data-stores";
import type {
  ComputedStyleDecl,
  StyleValueSource,
  StyleValueSourceColor,
} from "~/shared/style-object-model";
import { useComputedStyles } from "./shared/model";
import { useReadonly } from "./shared/readonly";
import { StyleSourceBadge } from "./style-source";
import { createBatchUpdate } from "./shared/use-style-data";
import { selectStyleSource } from "~/builder/shared/style-source-actions";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { $isAltPressed } from "./shared/modifier-keys";

const sourceHints: Record<StyleValueSourceColor, string> = {
  local: "Defined in the selected style source.",
  overwritten: "Defined here, but a later declaration takes precedence.",
  remote:
    "Comes from another style source, breakpoint, state, or parent element.",
  preset: "Comes from Webstudio component defaults.",
  default: "Comes from a browser default or CSS initial value.",
};

const renderCss = (styles: ComputedStyleDecl[], isComputed: boolean) => {
  let css = "";
  for (const styleDecl of styles) {
    const value = toValue(
      isComputed ? styleDecl.usedValue : styleDecl.cascadedValue
    );
    css += `${styleDecl.property}: ${value};\n`;
  }
  return css;
};

const deleteProperties = (properties: CssProperty[]) => {
  const batch = createBatchUpdate();
  for (const property of properties) {
    batch.deleteProperty(property);
  }
  batch.publish();
};

export const PropertyInfo = ({
  title,
  code,
  property,
  description,
  styles,
  onReset,
  resetType = "reset",
}: {
  title: string;
  code?: string;
  property: CssProperty;
  description: ReactNode;
  styles: ComputedStyleDecl[];
  onReset?: () => void;
  resetType?: "reset" | "delete";
}) => {
  const readonly = useReadonly();
  const breakpoints = useStore($breakpoints);
  const instances = useStore($instances);
  const virtualInstances = useStore($virtualInstances);
  const styleSources = useStore($styleSources);
  const metas = useStore($registeredComponentMetas);
  const isAltPressed = useStore($isAltPressed);
  const selectedInstanceId = useStore($selectedInstanceSelector)?.[0];
  const instancePath = useStore($selectedInstancePathWithRoot);

  let resettable = false;
  const breakpointSources = new Map<
    string,
    { label: string; source: StyleValueSource }
  >();
  const styleSourceNames = new Map<string, StyleValueSource>();
  const instanceSources = new Map<string, StyleValueSource>();

  for (const { source } of styles) {
    if (source.name === "local" || source.name === "overwritten") {
      resettable = true;
    }
    const instance = source.instanceId
      ? (instances.get(source.instanceId) ??
        virtualInstances.get(source.instanceId))
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
        styleSource.type === "token"
          ? styleSource.name
          : styleSource.type === "tagToken"
            ? `${styleSource.tag[0].toUpperCase()}${styleSource.tag.slice(1)} (All Pages)`
            : "Local";
      if (source.state) {
        const stateLabel =
          meta?.states?.find((item) => item.selector === source.state)?.label ??
          humanizeString(source.state);
        styleSourceNames.set(`${styleSourceName} (${stateLabel})`, source);
      } else {
        styleSourceNames.set(styleSourceName, source);
      }
    }
    if (breakpoint) {
      breakpointSources.set(breakpoint.id, {
        label:
          breakpoint.minWidth?.toString() ??
          breakpoint.maxWidth?.toString() ??
          "Base",
        source,
      });
    }
    if (instance && meta) {
      instanceSources.set(getInstanceLabel(instance), source);
    }
  }

  const jumpToSource = (source: StyleValueSource) => {
    const target = instancePath?.find(
      ({ instance }) => instance.id === source.instanceId
    );
    if (target === undefined) {
      return;
    }
    selectInstance(target.instanceSelector);
    if (source.styleSourceId) {
      if (styleSources.get(source.styleSourceId)?.type === "tagToken") {
        $temporaryTagTokenId.set(source.styleSourceId);
      }
      selectStyleSource(source.styleSourceId, source.state);
    } else {
      $selectedStyleState.set(source.state);
    }
    if (source.breakpointId) {
      $selectedBreakpointId.set(source.breakpointId);
    }
  };
  const canJumpToSource = (source: StyleValueSource) =>
    instancePath?.some(({ instance }) => instance.id === source.instanceId) ??
    false;
  const sourceBadges = [
    ...Array.from(breakpointSources, ([id, { label, source }]) => ({
      key: `breakpoint:${id}`,
      label,
      source,
      color: "breakpoint" as const,
    })),
    ...Array.from(styleSourceNames, ([label, source]) => ({
      key: `style:${label}`,
      label,
      source,
      color:
        source.styleSourceId &&
        styleSources.get(source.styleSourceId)?.type === "tagToken"
          ? ("tag" as const)
          : label === "Local"
            ? ("local" as const)
            : ("token" as const),
    })),
    ...Array.from(instanceSources, ([label, source]) => ({
      key: `instance:${label}`,
      label,
      source,
      color: "instance" as const,
    })),
  ];

  const mdnUrl = propertiesData[property]?.mdnUrl;
  const sourceColor =
    styles.length > 0 ? getPriorityStyleValueSource(styles) : undefined;
  let sourceLabel = sourceColor === "remote" ? "Cascaded" : sourceColor;
  let sourceDescription = sourceColor && sourceHints[sourceColor];
  if (
    selectedInstanceId !== undefined &&
    (sourceColor === "remote" || sourceColor === "preset")
  ) {
    const sourceInstances = styles
      .filter((style) => style.source.name === sourceColor)
      .map((style) => style.source.instanceId);
    if (
      sourceInstances.every(
        (instanceId) =>
          instanceId !== undefined && instanceId !== selectedInstanceId
      )
    ) {
      sourceLabel = sourceColor === "remote" ? "Inherited" : "Preset";
      sourceDescription =
        sourceColor === "remote"
          ? "Comes from a style on an ancestor element."
          : "Comes from a Webstudio component default on an ancestor element.";
    } else if (
      sourceColor === "remote" &&
      sourceInstances.every((instanceId) => instanceId === selectedInstanceId)
    ) {
      sourceDescription =
        "Comes from another style source, breakpoint, or state on this element.";
    }
  }
  return (
    <Flex direction="column" gap="2" css={{ maxWidth: theme.spacing[28] }}>
      <Flex justify="between">
        <Text variant="titles" truncate>
          {title}
        </Text>
        {mdnUrl && (
          <IconLink
            href={mdnUrl}
            target="_blank"
            rel="noreferrer"
            color="inherit"
            variant="inherit"
            size={13}
          />
        )}
      </Flex>
      <Text
        variant="monoBold"
        color="moreSubtle"
        userSelect="text"
        css={{ whiteSpace: "break-spaces", cursor: "text" }}
      >
        {code ?? renderCss(styles, isAltPressed)}
      </Text>
      <Text>{description}</Text>
      {sourceColor && (
        <Text>
          <strong>{humanizeString(sourceLabel ?? sourceColor)}: </strong>
          {sourceDescription}
        </Text>
      )}
      {(styleSourceNames.size > 0 || instanceSources.size > 0) && (
        <Flex
          direction="column"
          gap="1"
          css={{ paddingBottom: theme.spacing[5] }}
        >
          <Text color="moreSubtle">Value comes from</Text>
          <Flex gap="1" wrap="wrap">
            {sourceBadges.map(({ key, label, source, color }) => (
              <StyleSourceBadge
                as="button"
                type="button"
                key={key}
                source={color}
                variant="small"
                clickable
                disabled={!canJumpToSource(source)}
                onClick={() => jumpToSource(source)}
              >
                {label}
              </StyleSourceBadge>
            ))}
          </Flex>
        </Flex>
      )}
      {resettable && readonly === false && onReset && (
        <Button
          color="neutral-destructive"
          prefix={
            <Flex justify="end">
              <ResetIcon />
            </Flex>
          }
          suffix={<Kbd value={["alt", "click"]} color="moreSubtle" />}
          css={{ gridTemplateColumns: "1fr max-content 1fr" }}
          onClick={onReset}
        >
          {resetType === "delete" ? "Delete property" : "Reset value"}
        </Button>
      )}
    </Flex>
  );
};

export const getPriorityStyleValueSource = (
  styles: ComputedStyleDecl[]
): StyleValueSourceColor => {
  const customOrder: StyleValueSourceColor[] = [
    "overwritten",
    "local",
    "remote",
    "preset",
    "default",
  ];
  const styleSources = styles.map((styleDecl) => styleDecl.source.name);
  for (const color of customOrder) {
    if (styleSources.includes(color)) {
      return color;
    }
  }
  return "default";
};

const ResettablePropertyLabel = ({
  label,
  description,
  properties,
  disabled,
  asChild,
  children,
}: {
  label: string;
  description?: string;
  properties: [CssProperty, ...CssProperty[]];
  disabled?: boolean;
  asChild?: boolean;
  children: ReactNode;
}) => {
  const styles = useComputedStyles(properties);
  const readonly = useReadonly();
  const styleValueSourceColor = getPriorityStyleValueSource(styles);

  const resetProperty = () => {
    if (readonly) {
      return;
    }
    deleteProperties(properties);
  };

  return (
    <ResettableLabel
      asChild={asChild}
      disabled={disabled}
      color={styleValueSourceColor}
      onReset={
        styles.some(
          ({ source }) =>
            source.name === "local" || source.name === "overwritten"
        )
          ? resetProperty
          : undefined
      }
      resetDisabled={readonly}
      content={
        <PropertyInfo
          title={label}
          property={properties[0]}
          description={description}
          styles={styles}
        />
      }
    >
      {children}
    </ResettableLabel>
  );
};

export const PropertyLabel = ({
  label,
  description,
  properties,
  disabled,
}: {
  label: string;
  description?: string;
  properties: [CssProperty, ...CssProperty[]];
  disabled?: boolean;
}) => {
  return (
    <ResettablePropertyLabel
      label={label}
      description={description}
      properties={properties}
      disabled={disabled}
    >
      {label}
    </ResettablePropertyLabel>
  );
};

export const PropertySectionLabel = ({
  label,
  description,
  properties,
}: {
  label: string;
  description: string | undefined;
  properties: [CssProperty, ...CssProperty[]];
}) => (
  <ResettablePropertyLabel
    label={label}
    description={description}
    properties={properties}
    asChild
  >
    <SectionTitleLabel>{label}</SectionTitleLabel>
  </ResettablePropertyLabel>
);

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
  description?: string;
  properties?: [CssProperty, ...CssProperty[]];
  disabled?: boolean;
}) => {
  return (
    <ResettableLabel
      disabled={disabled}
      content={
        <>
          <Text variant="titles">{title ?? label}</Text>
          {properties && (
            <Text
              variant="monoBold"
              color="moreSubtle"
              userSelect="text"
              css={{ whiteSpace: "break-spaces", cursor: "text" }}
            >
              {properties.join("\n")}
            </Text>
          )}
          <Text>{description}</Text>
        </>
      }
    >
      {label}
    </ResettableLabel>
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
  description: string | undefined;
  properties: [CssProperty, ...CssProperty[]];
  isAdvanced?: boolean;
  children: ReactNode;
}) => {
  const styles = useComputedStyles(properties);
  const readonly = useReadonly();
  const [isOpen, setIsOpen] = useState(false);
  const resetProperty = () => {
    if (readonly) {
      return;
    }
    deleteProperties(properties);
  };

  return (
    <Tooltip
      open={isOpen}
      onOpenChange={setIsOpen}
      // prevent closing tooltip on content click
      onPointerDown={(event) => event.preventDefault()}
      triggerProps={{
        onClick: (event) => {
          if (readonly) {
            return;
          }
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
          property={properties[0]}
          description={
            <Flex gap="2" direction="column">
              {description}
              {isAdvanced && (
                <Flex gap="1">
                  <AlertIcon color={cssVar("--foreground-warning")} /> This
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
