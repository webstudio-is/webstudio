import { useState, type ReactElement } from "react";
import { useStore } from "@nanostores/react";
import {
  type StyleProperty,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import {
  theme,
  Button,
  Flex,
  Label,
  Tooltip,
  type TooltipProps,
  Text,
  ScrollArea,
} from "@webstudio-is/design-system";
import { ResetIcon } from "@webstudio-is/icons";
import type {
  Breakpoint,
  Breakpoints,
  StyleSource,
  StyleSources,
} from "@webstudio-is/project-build";
import { toProperty } from "@webstudio-is/css-engine";
import {
  breakpointsStore,
  instancesStore,
  selectedBreakpointStore,
  selectedInstanceStore,
  selectedStyleSourceStore,
  styleSourcesStore,
} from "~/shared/nano-states";
import {
  type StyleInfo,
  getStyleSource,
  type StyleValueInfo,
} from "./style-info";
import { humanizeString } from "~/shared/string-utils";
import { StyleSourceBadge } from "../style-source";

// We don't return source name only in case of preset or default value.
const getSourceName = (
  styleSources: StyleSources,
  styleValueInfo: StyleValueInfo,
  selectedStyleSource?: StyleSource
) => {
  if (styleValueInfo.nextSource) {
    const { styleSourceId } = styleValueInfo.nextSource;
    const styleSource = styleSources.get(styleSourceId);
    if (styleSource?.type === "local") {
      return "Local";
    }
    if (styleSource?.type === "token") {
      return styleSource.name;
    }
  }

  if (styleValueInfo.local) {
    return selectedStyleSource?.type === "token"
      ? selectedStyleSource.name
      : "Local";
  }

  if (styleValueInfo.previousSource) {
    const { styleSourceId } = styleValueInfo.previousSource;
    const styleSource = styleSources.get(styleSourceId);
    if (styleSource?.type === "local") {
      return "Local";
    }
    if (styleSource?.type === "token") {
      return styleSource.name;
    }
  }

  if (styleValueInfo.cascaded) {
    return selectedStyleSource?.type === "token"
      ? selectedStyleSource.name
      : "Local";
  }
};

const getBreakpointName = (
  styleValueInfo: StyleValueInfo,
  breakpoints: Breakpoints,
  selectedBreakpoint?: Breakpoint
) => {
  let breakpoint;
  if (
    styleValueInfo.local ||
    styleValueInfo.previousSource ||
    styleValueInfo.nextSource
  ) {
    breakpoint = selectedBreakpoint;
  } else if (styleValueInfo.cascaded) {
    const { breakpointId } = styleValueInfo.cascaded;
    breakpoint = breakpoints.get(breakpointId);
  }

  return breakpoint?.minWidth ?? breakpoint?.maxWidth ?? "Base";
};

const getDescription = (properties: StyleProperty[]) => {
  if (properties.length > 1) {
    return;
  }
  const property = properties[0];
  return propertyDescriptions[property as keyof typeof propertyDescriptions];
};

const TooltipContent = ({
  title,
  description,
  properties,
  style,
  onReset,
}: {
  title?: string;
  description?: React.ReactNode;
  properties: StyleProperty[];
  style: StyleInfo;
  onReset?: undefined | (() => void);
}) => {
  const breakpoints = useStore(breakpointsStore);
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const instances = useStore(instancesStore);
  const styleSources = useStore(styleSourcesStore);
  const instance = useStore(selectedInstanceStore);
  const selectedStyleSource = useStore(selectedStyleSourceStore);

  const descriptionWithFallback = description ?? getDescription(properties);

  const breakpointSet = new Set<string>();
  const styleSourceNameSet = new Set<string>();
  const instanceSet = new Set<string>();

  for (const property of properties) {
    const styleValueInfo = style[property];

    if (styleValueInfo === undefined) {
      continue;
    }

    const sourceName = getSourceName(
      styleSources,
      styleValueInfo,
      selectedStyleSource
    );

    if (sourceName !== undefined) {
      styleSourceNameSet.add(sourceName);
    }

    const breakpointName = getBreakpointName(
      styleValueInfo,
      breakpoints,
      selectedBreakpoint
    );

    breakpointSet.add(`${breakpointName}`);

    let instanceTitle = instance?.label ?? instance?.component;
    if (styleValueInfo.inherited && styleValueInfo.local === undefined) {
      const localInstance = instances.get(styleValueInfo.inherited.instanceId);
      instanceTitle = localInstance?.label ?? localInstance?.component;
    }

    if (instanceTitle !== undefined) {
      instanceSet.add(instanceTitle);
    }
  }

  const styleSourcesList = properties.map((property) =>
    getStyleSource(style[property])
  );

  return (
    <Flex direction="column" gap="2" css={{ maxWidth: theme.spacing[28] }}>
      <Text variant="titles">{title ?? humanizeString(properties[0])}</Text>
      <ScrollArea>
        <Text
          variant="monoBold"
          color="moreSubtle"
          css={{
            whiteSpace: "break-spaces",
            maxHeight: "3em",
            userSelect: "text",
            cursor: "text",
          }}
        >
          {properties.map(toProperty).join("\n")}
        </Text>
      </ScrollArea>
      {descriptionWithFallback && <Text>{descriptionWithFallback}</Text>}
      {styleSourceNameSet.size > 0 && (
        <Flex
          direction="column"
          gap="1"
          css={{ paddingBottom: theme.spacing[5] }}
        >
          <Text color="moreSubtle">Value comes from</Text>
          <Flex gap="1" wrap="wrap">
            {Array.from(breakpointSet).map((breakpointName) => (
              <StyleSourceBadge
                key={breakpointName}
                source="breakpoint"
                variant="small"
              >
                {breakpointName}
              </StyleSourceBadge>
            ))}

            {Array.from(styleSourceNameSet).map((sourceName) => (
              <StyleSourceBadge key={sourceName} source="token" variant="small">
                {sourceName}
              </StyleSourceBadge>
            ))}

            {Array.from(instanceSet).map((instanceTitle) => (
              <StyleSourceBadge
                key={instanceTitle}
                source="instance"
                variant="small"
              >
                {instanceTitle}
              </StyleSourceBadge>
            ))}
          </Flex>
        </Flex>
      )}
      {(styleSourcesList.includes("local") ||
        styleSourcesList.includes("overwritten")) &&
        onReset !== undefined && (
          <Button
            color="dark"
            prefix={<ResetIcon />}
            css={{ flexGrow: 1 }}
            onClick={onReset}
          >
            Reset value
          </Button>
        )}
    </Flex>
  );
};

export const PropertyTooltip = ({
  openWithClick = false,
  title,
  description,
  properties,
  style,
  onReset,
  children,
  open,
  onOpenChange,
  side,
}: {
  openWithClick?: boolean;
  title?: string;
  description?: React.ReactNode;
  properties: StyleProperty[];
  style: StyleInfo;
  onReset?: undefined | (() => void);
  children: ReactElement;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  side?: TooltipProps["side"];
}) => {
  const [isOpenInternal, setIsOpenInternal] = useState(open ?? false);

  const handleIsOpen = onOpenChange ?? setIsOpenInternal;
  const isOpen = open ?? isOpenInternal;

  return (
    <Tooltip
      open={isOpen}
      onOpenChange={handleIsOpen}
      side={side}
      // prevent closing tooltip on content click
      onPointerDown={(event) => event.preventDefault()}
      triggerProps={{
        onClick: (event) => {
          if (event.altKey) {
            event.preventDefault();
            onReset?.();
            return;
          }
          if (openWithClick) {
            handleIsOpen(true);
          }
        },
      }}
      content={
        <TooltipContent
          title={title}
          description={description}
          properties={properties}
          style={style}
          onReset={
            onReset
              ? () => {
                  onReset();
                  handleIsOpen(false);
                }
              : undefined
          }
        />
      }
      disableHoverableContent={onReset === undefined}
    >
      {children}
    </Tooltip>
  );
};

type PropertyNameInternalProps = {
  style: StyleInfo;
  properties: StyleProperty[];
  label: string | ReactElement;
  title?: string;
  description?: React.ReactNode;
  onReset?: () => void;
  disabled?: boolean;
};

const PropertyNameInternal = ({
  style,
  title,
  description,
  properties,
  label,
  onReset,
  disabled,
}: PropertyNameInternalProps) => {
  // When we have multiple properties, they must be originating from the same source, so we can just use one.
  const property = properties[0];

  return (
    <Flex align="center">
      <PropertyTooltip
        openWithClick={true}
        title={title ?? (typeof label === "string" ? label : undefined)}
        description={description}
        properties={properties}
        style={style}
        onReset={onReset}
      >
        <Flex shrink gap={1} align="center">
          {typeof label === "string" && property ? (
            <Label
              color={
                onReset === undefined
                  ? "default"
                  : getStyleSource(style[property])
              }
              truncate
              disabled={disabled}
            >
              {label}
            </Label>
          ) : (
            label
          )}
        </Flex>
      </PropertyTooltip>
    </Flex>
  );
};

type PropertyNameProps = {
  style: StyleInfo;
  properties: StyleProperty[];
  label: string | ReactElement;
  title?: string;
  description?: React.ReactNode;
  onReset: () => void;
};

export const PropertyName = ({
  style,
  title,
  description,
  properties,
  label,
  onReset,
}: PropertyNameProps) => (
  <PropertyNameInternal
    style={style}
    title={title}
    description={description}
    properties={properties}
    label={label}
    onReset={onReset}
  />
);

type NonResetablePropertyNameProps = {
  style: StyleInfo;
  properties: StyleProperty[];
  label: string | ReactElement;
  title?: string;
  description?: React.ReactNode;
  disabled?: boolean;
};
/**
 * Some properties like layered background-image, background-size are non resetable.
 * UI of background would be unreadable, imagine you have
 * background-size inherited from one source, background-image from the other,
 * Every property have different amount of layers. The final result on the screen would be a mess.
 */
export const NonResetablePropertyName = ({
  style,
  title,
  description,
  properties,
  label,
  disabled,
}: NonResetablePropertyNameProps) => (
  <PropertyNameInternal
    style={style}
    title={title}
    description={description}
    properties={properties}
    label={label}
    disabled={disabled}
  />
);
