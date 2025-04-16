import { toValue } from "@webstudio-is/css-engine";
import { Box, keyframes, styled, theme } from "@webstudio-is/design-system";
import type {
  ScrollRangeOptionsSchema,
  ViewRangeOptionsSchema,
} from "@webstudio-is/sdk";
import { useEffect, useRef } from "react";

type AnimationRangesProps = ViewRangeOptionsSchema;

const progressVariable = "--ws-progress";

const Wrapper = styled(Box, {
  position: "relative",
  alignSelf: "stretch",
});

const InsetLine = styled(Box, {
  position: "absolute",
  left: 0,
  right: 0,
  backgroundColor: "rgba(255, 255, 255, 0.6)",
});

const Scrollable = styled(Box, {
  position: "absolute",
  inset: 0,
  overflowY: "scroll",

  "&::-webkit-scrollbar": {
    display: "none",
  },
});

const bgKeyframes = keyframes({
  "0%": { [progressVariable]: "0" },
  "100%": { [progressVariable]: "360" },
});

const rafInterval = (callback: () => void): (() => void) => {
  let frameId: number;

  const loop = () => {
    callback();
    frameId = requestAnimationFrame(loop);
  };

  frameId = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frameId);
  };
};

export const AnimationRanges = (props: {
  rangeStart:
    | AnimationRangesProps["rangeStart"]
    | ScrollRangeOptionsSchema["rangeStart"];
  rangeEnd:
    | AnimationRangesProps["rangeEnd"]
    | ScrollRangeOptionsSchema["rangeEnd"];
}) => {
  const scrollableRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      CSS.registerProperty({
        name: progressVariable,
        syntax: "<number>",
        inherits: true,
        initialValue: "0",
      });
    } catch {
      /* */
    }

    const scrollable = scrollableRef.current;
    const subject = subjectRef.current;

    if (scrollable == null) {
      return;
    }

    if (subject == null) {
      return;
    }

    const scrollHeight = scrollable.scrollHeight;
    const clientHeight = scrollable.clientHeight;

    const startTime = Date.now();

    return rafInterval(() => {
      const timeDelta = Date.now() - startTime;

      scrollable.scrollTop =
        (Math.sin(timeDelta / 1000) * (scrollHeight - clientHeight)) / 2 +
        (scrollHeight - clientHeight) / 2;

      const progress =
        subject.parentElement?.getAnimations()?.[0]?.effect?.getComputedTiming()
          ?.progress ?? 0;

      const content = `${(progress * 100).toFixed(0)}%`;

      if (subject.textContent !== content) {
        subject.textContent = `${(progress * 100).toFixed(0)}%`;
      }
    });
  }, []);

  const rangeStart = props.rangeStart ?? [
    "cover",
    {
      type: "unit",
      value: 0,
      unit: "%",
    },
  ];
  const rangeEnd = props.rangeEnd ?? [
    "cover",
    {
      type: "unit",
      value: 100,
      unit: "%",
    },
  ];

  const insetSize = "28px";
  const boxSize = "28px";
  const borderColor = "#ccc";

  const progressRadius = "4px";
  const progressWidth = "2px";
  const progressInactiveColor = "oklch(92.9% 0.013 255.508)";
  const progressActiveColor = "oklch(54.6% 0.245 262.881)";

  return (
    <Wrapper>
      <Scrollable ref={scrollableRef}>
        <Box
          css={{
            height: `calc(100% - ${insetSize})`,
          }}
        />
        <Box
          css={{
            height: boxSize,
            animationName: `${bgKeyframes}`,
            animationTimingFunction: "linear",
            animationFillMode: "both",

            animationRangeStart: `${rangeStart[0]} ${toValue(rangeStart[1])}`,
            animationRangeEnd: `${rangeEnd[0]} ${toValue(rangeEnd[1])}`,
            animationTimeline: `view(y ${insetSize})`,

            position: "relative",
            borderRadius: progressRadius,
          }}
        >
          <Box
            css={{
              position: "absolute",
              inset: 0,
              borderRadius: progressRadius,

              background: `conic-gradient(${progressActiveColor} calc(var(${progressVariable}, 0) * 1deg), ${progressInactiveColor} 0)`,
            }}
          />

          <Box
            ref={subjectRef}
            css={{
              position: "absolute",
              inset: 0,
              fontSize: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "pre",
              textAlign: "center",
              fontFamily: theme.fonts.robotoMono,
              background: `linear-gradient(-90deg, oklch(97% 0.014 254.604) calc(var(${progressVariable}, 0) * 100%/360), white calc(var(${progressVariable}, 0) * 100%/360) )`,
              margin: progressWidth,
              borderRadius: `calc(${progressRadius} - 3px)`,
            }}
          ></Box>
        </Box>
        <Box
          css={{
            height: `calc(100% - ${insetSize})`,
          }}
        />
      </Scrollable>
      <InsetLine
        // @ts-expect-error inert
        inert={""}
        css={{
          height: insetSize,
          top: 0,
          borderBottom: `1px solid ${borderColor}`,
        }}
      />
      <InsetLine
        // @ts-expect-error inert
        inert={""}
        css={{
          bottom: 0,
          borderTop: `1px solid ${borderColor}`,
          height: insetSize,
        }}
      />
    </Wrapper>
  );
};
