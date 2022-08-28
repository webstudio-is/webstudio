import { Label } from "@webstudio-is/design-system";
import { useIsFromCurrentBreakpoint } from "./use-is-from-current-breakpoint";
import { propertyNameColorForSelectedBreakpoint } from "./constants";
import type { PropertyProps } from "../style-sections";

export const PropertyName = ({ property, label, css }: PropertyProps) => {
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(property);

  return (
    <Label
      css={{
        display: "flex",
        alignItems: "center",
        gridColumn: "1",
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
        ...css,
      }}
      variant="contrast"
      size="1"
      htmlFor={property}
    >
      {label}
    </Label>
  );
};
