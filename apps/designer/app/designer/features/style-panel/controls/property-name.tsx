import { Label } from "@webstudio-is/design-system";
import { useIsFromCurrentBreakpoint } from "../shared/use-is-from-current-breakpoint";
import { propertyNameColorForSelectedBreakpoint } from "../shared/constants";
import type { PropertyProps } from "../style-sections";

const PropertyName = ({ property, label, css }: PropertyProps) => {
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(property);

  return (
    <Label
      css={{
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

export { PropertyName };
