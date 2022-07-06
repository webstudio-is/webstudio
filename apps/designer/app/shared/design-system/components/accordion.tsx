import React from "react";
import { styled, CSS } from "../stitches.config";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "~/shared/icons";

const StyledAccordion = styled(AccordionPrimitive.Root, {});

type AccordionPrimitiveProps = React.ComponentProps<
  typeof AccordionPrimitive.Root
>;
type AccordionProps = AccordionPrimitiveProps & { css?: CSS };

export const Accordion = React.forwardRef<
  React.ElementRef<typeof StyledAccordion>,
  AccordionProps
>(({ children, ...props }, forwardedRef) => (
  <StyledAccordion
    ref={forwardedRef}
    {...props}
    {...(props.type === "single" ? { collapsible: true } : {})}
  >
    {children}
  </StyledAccordion>
));
Accordion.displayName = "Accordion";

const StyledItem = styled(AccordionPrimitive.Item, {
  borderTop: "1px solid $colors$slate6",

  "&:last-of-type": {
    borderBottom: "1px solid $colors$slate6",
  },
});

const StyledHeader = styled(AccordionPrimitive.Header, {
  all: "unset",
});

const StyledTrigger = styled(AccordionPrimitive.Trigger, {
  all: "unset",
  boxSizing: "border-box",
  userSelect: "none",
  "&::before": {
    boxSizing: "border-box",
  },
  "&::after": {
    boxSizing: "border-box",
  },

  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  p: "$2",
  color: "$hiContrast",
  width: "100%",

  "@hover": {
    "&:hover": {
      backgroundColor: "$slate2",
    },
  },

  "&:focus": {
    outline: "none",
    boxShadow: "inset 0 0 0 1px $colors$slate8, 0 0 0 1px $colors$slate8",
  },

  svg: {
    transition: "transform 175ms cubic-bezier(0.65, 0, 0.35, 1)",
  },

  '&[data-state="open"]': {
    svg: {
      transform: "rotate(180deg)",
    },
  },
});

type AccordionTriggerPrimitiveProps = React.ComponentProps<
  typeof AccordionPrimitive.Trigger
>;
type AccordionTriggerProps = AccordionTriggerPrimitiveProps & { css?: CSS };

export const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof StyledTrigger>,
  AccordionTriggerProps
>(({ children, ...props }, forwardedRef) => (
  <StyledHeader>
    <StyledTrigger {...props} ref={forwardedRef}>
      {children}
      <ChevronDownIcon />
    </StyledTrigger>
  </StyledHeader>
));
AccordionTrigger.displayName = "AccordionTrigger";

const StyledContent = styled(AccordionPrimitive.Content, {
  p: "$2",
});

export const AccordionItem = StyledItem;
export const AccordionContent = StyledContent;
