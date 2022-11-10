import { Flex, Label, Tooltip } from "@webstudio-is/design-system";
import { useIsFromCurrentBreakpoint } from "./use-is-from-current-breakpoint";
import { propertyNameColorForSelectedBreakpoint } from "./constants";
import type { PropertyProps } from "../style-sections";

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
                  padding: "calc($radii$spacing$3 / 2) $radii$spacing$3",
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
