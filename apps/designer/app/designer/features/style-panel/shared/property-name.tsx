import { Flex, Label, Tooltip, IconButton } from "@webstudio-is/design-system";
import { useIsFromCurrentBreakpoint } from "./use-is-from-current-breakpoint";
import { propertyNameColorForSelectedBreakpoint } from "./constants";
import type { PropertyProps } from "../style-sections";
import { iconConfigs } from "./configs";
import { forwardRef, PointerEventHandler } from "react";

export const PropertyName = ({ property, label, css }: PropertyProps) => {
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(property);

  return (
    <Tooltip content={label} delayDuration={600} disableHoverableContent={true}>
      <Flex
        css={{
          ...css,
          alignItems: "center",
        }}
      >
        <Label
          css={{
            gridColumn: "1",
            fontWeight: "inherit",
            ...(isCurrentBreakpoint
              ? {
                  color: propertyNameColorForSelectedBreakpoint,
                  backgroundColor: "$colors$blue4",
                  padding: "calc($radii$1 / 2) $radii$1",
                  borderRadius: "$radii$1",
                }
              : {
                  color: "$hiContrast",
                }),
          }}
          htmlFor={property}
        >
          {label}
        </Label>
      </Flex>
    </Tooltip>
  );
};
PropertyName.displayName = "PropertyName";

export const PropertyIcon = forwardRef<
  HTMLButtonElement,
  PropertyProps & { [key: `on${string}`]: PointerEventHandler }
>(({ property, label, ...props }, forwardRef) => {
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(property);
  const IconType = iconConfigs[property]?.normal;
  if (!IconType) return null;

  return (
    <Tooltip content={label} delayDuration={600} disableHoverableContent={true}>
      <IconButton
        {...props}
        ref={forwardRef}
        size="1"
        css={{
          borderRadius: "$1",
          border: "2px solid $colors$loContrast",
          ...(isCurrentBreakpoint && {
            bc: "$colors$blue4",
            color: "$colors$blue11",
            "&:hover,&:active,&:focus": {
              bc: "$colors$blue4",
              color: "$colors$blue11",
            },
          }),
        }}
      >
        <IconType />
      </IconButton>
    </Tooltip>
  );
});
PropertyIcon.displayName = "PropertyIcon";
