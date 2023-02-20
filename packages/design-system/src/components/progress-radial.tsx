import React from "react";
import type { CSS } from "../stitches.config";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { Box } from "./box";

type ProgressBarPrimitiveProps = React.ComponentProps<
  typeof ProgressPrimitive.Root
>;
type ProgressRadialProps = ProgressBarPrimitiveProps & { css?: CSS };

export const ProgressRadial = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressRadialProps
>(({ value, max = 100, css, ...props }, forwardedRef) => {
  const percentage = value != null ? Math.round((value / max) * 100) : 0;
  const multiplicate = 360 / max;

  return (
    <ProgressPrimitive.Root
      {...props}
      value={value}
      max={max}
      ref={forwardedRef}
    >
      <Box
        css={css}
        as="svg"
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="32" cy="32" r="24" fill="#11181C" />
        <path
          d="M36.3989 32.0385C36.9929 32.616 37.9425 32.6026 38.52 32.0086C39.0975 31.4147 39.0841 30.465 38.4901 29.8875L36.3989 32.0385ZM32.1112 25.7778L33.1568 24.7023C32.5746 24.1363 31.6477 24.1363 31.0655 24.7023L32.1112 25.7778ZM25.7322 29.8875C25.1382 30.465 25.1249 31.4147 25.7023 32.0086C26.2798 32.6026 27.2295 32.616 27.8234 32.0385L25.7322 29.8875ZM30.6112 38.2223C30.6112 39.0507 31.2827 39.7223 32.1112 39.7223C32.9396 39.7223 33.6112 39.0507 33.6112 38.2223H30.6112ZM38.4901 29.8875L33.1568 24.7023L31.0655 26.8533L36.3989 32.0385L38.4901 29.8875ZM31.0655 24.7023L25.7322 29.8875L27.8234 32.0385L33.1568 26.8533L31.0655 24.7023ZM33.6112 38.2223V25.7778H30.6112V38.2223H33.6112Z"
          fill="white"
        />
        <circle
          fill="none"
          stroke="white"
          strokeWidth="3"
          cx="32"
          cy="32"
          r="18"
          strokeDasharray={360}
          strokeDashoffset={360 - percentage * multiplicate}
        ></circle>
      </Box>
    </ProgressPrimitive.Root>
  );
});
ProgressRadial.displayName = "ProgressRadial";
