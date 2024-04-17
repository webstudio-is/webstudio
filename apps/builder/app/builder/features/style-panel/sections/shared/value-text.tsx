import { styled, Text } from "@webstudio-is/design-system";
import type { StyleValue } from "@webstudio-is/css-engine";
import { useMemo, type ComponentProps } from "react";
import { theme } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";

const Container = styled("button", {
  // fit-content is not needed for the "button" element,
  // leave it here in case of tag change
  width: "fit-content",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  justifyContent: "center",
  border: "none",
  borderRadius: theme.borderRadius[3],
  padding: `${theme.spacing[2]}`,

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
    { source: "default", css: { color: theme.colors.slate12 } },
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
      return <Text variant="spaceSectionValueText">--{value.value}</Text>;
    }

    return (
      <Text css={{}} variant="spaceSectionValueText">
        {toValue(value)}
      </Text>
    );
  }, [value, source]);

  return (
    <Container source={source} {...rest} tabIndex={-1}>
      {children}
    </Container>
  );
};
