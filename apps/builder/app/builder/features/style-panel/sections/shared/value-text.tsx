import { styled, Text } from "@webstudio-is/design-system";
import type { StyleValue } from "@webstudio-is/css-engine";
import { useEffect, useMemo, type ComponentProps } from "react";
import { theme } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { scrollByPointer } from "../../shared/scroll-by-pointer";

const Container = styled("button", {
  // fit-content is not needed for the "button" element,
  // leave it here in case of tag change
  width: "fit-content",
  maxWidth: "100%",
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "baseline",
  justifyContent: "start",
  border: "none",
  borderRadius: theme.borderRadius[3],
  paddingBlock: theme.spacing[2],
  paddingInline: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  // We want value to have `default` cursor to indicate that it's clickable,
  // unlike the rest of the value area that has cursor that indicates scrubbing.
  // Click and scrub works everywhere anyway, but we want cursors to be different.
  //
  // In order to have control over cursor we're setting pointerEvents to "all" here
  // because SpaceLayout sets it to "none" for cells' content.
  pointerEvents: "all",

  "&:focus-visible": {
    outline: "none",
  },

  variants: {
    source: {
      default: {
        color: theme.colors.foregroundMain,
        backgroundColor: "transparent",
      },
      local: {
        color: theme.colors.foregroundLocalMain,
        backgroundColor: theme.colors.backgroundLocalMain,
      },
      overwritten: {
        color: theme.colors.foregroundOverwrittenMain,
        backgroundColor: theme.colors.backgroundOverwrittenMain,
      },
      preset: {
        color: theme.colors.foregroundMain,
        backgroundColor: theme.colors.backgroundPresetMain,
      },
      remote: {
        color: theme.colors.foregroundRemoteMain,
        backgroundColor: theme.colors.backgroundRemoteMain,
      },
    },
  },
  compoundVariants: [
    { source: "default", css: { color: theme.colors.foregroundTextSubtle } },
  ],
});

export const ValueText = ({
  value,
  source,
  ...rest
}: { value: StyleValue } & Omit<ComponentProps<typeof Container>, "value">) => {
  const children = useMemo(() => {
    if (value.type === "unit") {
      // we want to show "0" rather than "0px" for default values for cleaner UI
      if (source === "default" && value.unit === "px" && value.value === 0) {
        return <Text variant="spaceSectionValueText">{value.value}</Text>;
      }

      /**
       * To prevent span width to change replace all numbers with wide characters. "3" looks like the wides with current font
       **/
      const wideValue = `${value.value}`.replace(/\d/g, "3");

      return (
        <>
          <Text variant="spaceSectionValueText">
            {value.value}
            <Text
              variant="spaceSectionValueText"
              css={{ height: 0, visibility: "hidden" }}
            >
              {wideValue}
            </Text>
          </Text>
          {value.unit !== "number" && (
            <Text variant="spaceSectionUnitText">{value.unit}</Text>
          )}
        </>
      );
    }

    if (value.type === "var") {
      return <Text variant="spaceSectionValueText">{value.value}</Text>;
    }

    return <Text variant="spaceSectionValueText">{toValue(value)}</Text>;
  }, [value, source]);

  const { abort, ...autoScrollProps } = useMemo(scrollByPointer, []);

  useEffect(() => {
    return () => abort("unmount");
  }, [abort]);

  return (
    <Container source={source} {...rest} {...autoScrollProps} tabIndex={-1}>
      {children}
    </Container>
  );
};
