import { styled } from "@webstudio-is/design-system";
import type { StyleValue } from "@webstudio-is/css-data";
import { useLayoutEffect, useMemo, useRef, type ComponentProps } from "react";
import { theme } from "@webstudio-is/design-system";

const Container = styled("span", {
  boxSizing: "border-box",
  maxWidth: "100%",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  justifyContent: "center",
  border: "1px solid transparent",
  borderRadius: theme.borderRadius[3],
  padding: `0 ${theme.spacing[1]}`,
  variants: {
    source: {
      default: {
        color: theme.colors.foregroundMain,
      },
      local: {
        color: theme.colors.foregroundLocalMain,
        backgroundColor: theme.colors.backgroundLocalMain,
        borderColor: theme.colors.borderLocalMain,
      },
      overwritten: {
        color: theme.colors.foregroundOverwrittenMain,
        backgroundColor: theme.colors.backgroundOverwrittenMain,
        borderColor: theme.colors.borderOverwrittenMain,
      },
      preset: {
        color: theme.colors.foregroundMain,
        backgroundColor: theme.colors.backgroundPresetMain,
        borderColor: theme.colors.borderMain,
      },
      remote: {
        color: theme.colors.foregroundRemoteMain,
        backgroundColor: theme.colors.backgroundRemoteMain,
        borderColor: theme.colors.borderRemoteMain,
      },
    },
    isActive: { true: {} },
  },
  compoundVariants: [
    { source: "default", isActive: true, css: { color: theme.colors.slate12 } },
  ],
});

const Span = styled("span", {
  display: "block",
  fontSize: theme.deprecatedFontSize[2],
  lineHeight: 1,
  overflow: "hidden",
  maxWidth: "100%",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  variants: {
    keyword: {
      true: {
        fontSize: theme.deprecatedFontSize[1],
        textTransform: "uppercase",
      },
    },
  },
});

export const ValueText = ({
  value,
  source,
  ...rest
}: { value: StyleValue } & ComponentProps<typeof Container>) => {
  const children = useMemo(() => {
    if (value.type === "unit") {
      // we want to show "0" rather than "0px" for default values for cleaner UI
      if (source === "default" && value.unit === "px" && value.value === 0) {
        return <Span>{value.value}</Span>;
      }

      return (
        <>
          <Span>{value.value}</Span>
          {value.unit !== "number" && <Span keyword>{value.unit}</Span>}
        </>
      );
    }

    if (value.type === "var") {
      return <Span keyword>--{value.value}</Span>;
    }

    // @todo: not sure this is the best way to handle "invalid"
    if (value.type === "keyword" || value.type === "invalid") {
      return <Span keyword>{value.value}</Span>;
    }

    // @todo: not sure this is the best way to handle "unset"
    if (value.type === "unset") {
      return <Span keyword>unset</Span>;
    }

    throw new Error(`Unexpected StyleValue type ${value.type}`);
  }, [value, source]);

  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }

    // When content wraps, browser sets width of Container to the value of max-width,
    // but we want it to "hug" content.
    // width:max-content sounds like it would do the trick, but has no effect in this case.
    // width:min-content works, but it causes content to wrap even when there is enough space.
    //
    // So we solve this with JavaScript by using min-content,
    // but only if it doesn't cause wrapping.

    element.style.width = "auto";
    const heightWithAuto = element.getBoundingClientRect().height;

    element.style.width = "min-content";
    const heightWithMinContent = element.getBoundingClientRect().height;

    if (heightWithAuto !== heightWithMinContent) {
      element.style.width = "auto";
    }
  }, [children]);

  return (
    <Container source={source} {...rest} ref={ref}>
      {children}
    </Container>
  );
};
