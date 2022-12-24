import { useMemo, useState } from "react";
import type { Style, StyleProperty } from "@webstudio-is/css-data";
import {
  Button,
  Flex,
  Box,
  Text,
  Label,
  Tooltip,
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
  Separator,
} from "@webstudio-is/design-system";
import { UndoIcon } from "@webstudio-is/icons";
import { utils } from "@webstudio-is/project";
import { isFeatureEnabled } from "~/shared/feature-flags";
import { CascadedStyle, InheritedStyle } from "./style-source";
import { useBreakpoints, useRootInstance } from "~/shared/nano-states";

type StyleSource = {
  type: "set" | "unset";
  cascaded?: CascadedStyle[StyleProperty];
  inherited?: InheritedStyle[StyleProperty];
};

const getStyleSource = ({
  property,
  setStyle,
  cascadedStyle,
  inheritedStyle,
}: {
  property: StyleProperty | StyleProperty[];
  setStyle: Style;
  cascadedStyle: CascadedStyle;
  inheritedStyle: InheritedStyle;
}): StyleSource => {
  const properties = Array.isArray(property) ? property : [property];
  // assume at least one match describes all styles
  for (const property of properties) {
    if (setStyle[property] !== undefined) {
      const cascaded = cascadedStyle[property];
      const inherited = inheritedStyle[property];
      return { type: "set", cascaded, inherited };
    }
  }
  for (const property of properties) {
    const cascaded = cascadedStyle[property];
    const inherited = inheritedStyle[property];
    if (cascaded !== undefined || inherited !== undefined) {
      return { type: "unset", cascaded, inherited };
    }
  }
  return { type: "unset" };
};

type PropertyProps = {
  property: StyleProperty | StyleProperty[];
  label: string;
  setStyle: Style;
  cascadedStyle: CascadedStyle;
  inheritedStyle: InheritedStyle;
  onReset: () => void;
};

const PropertyPopoverContent = ({
  styleSource,
  onReset,
}: {
  styleSource: StyleSource;
  onReset: () => void;
}) => {
  const [rootInstance] = useRootInstance();
  const [breakpoints] = useBreakpoints();
  const cascadedFromBreakpoint = useMemo(() => {
    if (styleSource.cascaded === undefined) {
      return;
    }
    const { breakpointId } = styleSource.cascaded;
    return breakpoints.find((breakpoint) => breakpoint.id === breakpointId);
  }, [breakpoints, styleSource]);
  const inheritedFromInstance = useMemo(() => {
    if (rootInstance === undefined || styleSource.inherited === undefined) {
      return;
    }
    return utils.tree.findInstanceById(
      rootInstance,
      styleSource.inherited.instanceId
    );
  }, [rootInstance, styleSource]);

  if (styleSource.type === "set") {
    return (
      <>
        <Flex align="start" css={{ px: "$spacing$4", py: "$spacing$3" }}>
          <Button onClick={onReset}>
            <UndoIcon /> &nbsp; Reset
          </Button>
        </Flex>
        <Separator />
        <Box css={{ px: "$spacing$4", py: "$spacing$3" }}>
          {cascadedFromBreakpoint ? (
            <Text color="hint">
              Resetting will change to cascaded value from{" "}
              {cascadedFromBreakpoint.label}
            </Text>
          ) : inheritedFromInstance ? (
            <Text color="hint">
              Resetting will change to inherited value from{" "}
              {inheritedFromInstance.component}
            </Text>
          ) : (
            <Text color="hint">Resetting will change to initial value</Text>
          )}
        </Box>
      </>
    );
  }

  return (
    <Box css={{ px: "$spacing$4", py: "$spacing$3" }}>
      {cascadedFromBreakpoint ? (
        <Text color="hint">
          Value is cascaded from {cascadedFromBreakpoint.label}
        </Text>
      ) : inheritedFromInstance ? (
        <Text color="hint">
          Value is inherited from {inheritedFromInstance.component}
        </Text>
      ) : null}
    </Box>
  );
};

export const PropertyName = ({
  property,
  label,
  setStyle,
  cascadedStyle,
  inheritedStyle,
  onReset,
}: PropertyProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const styleSource = useMemo(() => {
    return getStyleSource({
      property,
      setStyle,
      cascadedStyle,
      inheritedStyle,
    });
  }, [property, setStyle, cascadedStyle, inheritedStyle]);

  if (property === "fontWeight") {
    console.log(styleSource);
  }

  const isPopoverEnabled =
    isFeatureEnabled("propertyReset") &&
    (styleSource.type === "set" ||
      styleSource.cascaded ||
      styleSource.inherited);

  const labelElement = (
    <Label
      css={{
        fontWeight: "inherit",
        padding: "calc($spacing$3 / 2) $spacing$3",
        ...(styleSource.type === "set"
          ? {
              color: "$blue11",
              backgroundColor: "$blue4",
              borderRadius: "$borderRadius$4",
            }
          : styleSource.cascaded || styleSource.inherited
          ? {
              color: "$orange11",
              backgroundColor: "$orange4",
              borderRadius: "$borderRadius$4",
            }
          : styleSource.type === "unset" && {
              color: "$hiContrast",
            }),
      }}
      htmlFor={property.toString()}
    >
      {label}
    </Label>
  );

  if (isPopoverEnabled) {
    return (
      <Flex align="center">
        <Popover modal open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild aria-label="Show proprety description">
            {labelElement}
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent align="start" onClick={() => setIsOpen(false)}>
              <PropertyPopoverContent
                styleSource={styleSource}
                onReset={onReset}
              />
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      </Flex>
    );
  }

  return (
    <Flex align="center">
      <Tooltip
        content={label}
        delayDuration={600}
        disableHoverableContent={true}
      >
        {labelElement}
      </Tooltip>
    </Flex>
  );
};
