import { styled } from "@webstudio-is/design-system";
import type { StyleValue } from "@webstudio-is/css-data";
import { useLayoutEffect, useMemo, useRef, type ComponentProps } from "react";

const Container = styled("span", {
  boxSizing: "border-box",
  maxWidth: "100%",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  justifyContent: "center",
  border: "1px solid transparent",
  borderRadius: "$borderRadius$3",
  padding: "0 $spacing$1",
  variants: {
    origin: {
      unset: { color: "$colors$slate11" },
      set: {
        color: "$colors$blue11",
        backgroundColor: "$colors$blue4",
        borderColor: "$colors$blue6",
      },
      preset: {
        // as I'm adding this Figma already uses new colors system,
        // so I don't know which tokens to use from our legacy system
        color: "#11181C", // foreground/main
        backgroundColor: "#DFE3E6", // background/preset/main
        borderColor: "#C1C8CD", // border/main
      },
      inherited: {
        color: "$colors$orange11",
        backgroundColor: "$colors$orange4",
        borderColor: "$colors$orange6",
      },
    },
    isActive: { true: {} },
  },
  compoundVariants: [
    { origin: "unset", isActive: true, css: { color: "$colors$slate12" } },
  ],
});

const Span = styled("span", {
  display: "block",
  fontSize: "$fontSize$2",
  lineHeight: 1,
  overflow: "hidden",
  maxWidth: "100%",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  variants: {
    keyword: { true: { fontSize: "$fontSize$1", textTransform: "uppercase" } },
  },
});

export const ValueText = ({
  value,
  origin,
  ...rest
}: { value: StyleValue } & ComponentProps<typeof Container>) => {
  const children = useMemo(() => {
    if (value.type === "unit") {
      // we want to show "0" rather than "0px" for unset values for cleaner UI
      if (origin === "unset" && value.unit === "px" && value.value === 0) {
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
  }, [value, origin]);

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
    <Container origin={origin} {...rest} ref={ref}>
      {children}
    </Container>
  );
};
