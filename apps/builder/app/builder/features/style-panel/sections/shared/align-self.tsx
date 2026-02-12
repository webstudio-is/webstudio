import { Grid } from "@webstudio-is/design-system";
import {
  XSmallIcon,
  AlignSelfStartIcon,
  AlignSelfEndIcon,
  AlignSelfCenterIcon,
  AlignSelfBaselineIcon,
  AlignSelfStretchIcon,
} from "@webstudio-is/icons";
import { PropertyLabel } from "../../property-label";
import { ToggleGroupControl } from "../../controls/toggle-group/toggle-group-control";
import { propertyDescriptions } from "@webstudio-is/css-data";

type AlignSelfControlProps = {
  /**
   * "flex" uses flex-start/flex-end values
   * "grid" uses start/end values
   */
  variant: "flex" | "grid";
};

export const AlignSelfControl = ({ variant }: AlignSelfControlProps) => {
  const startValue = variant === "flex" ? "flex-start" : "start";
  const endValue = variant === "flex" ? "flex-end" : "end";
  const axisName = variant === "flex" ? "cross axis" : "block axis";

  return (
    <Grid css={{ gridTemplateColumns: "3fr 8fr" }}>
      <PropertyLabel
        label="Align"
        description={propertyDescriptions.alignSelf}
        properties={["align-self"]}
      />
      <ToggleGroupControl
        label="Align"
        properties={["align-self"]}
        items={[
          {
            child: <XSmallIcon />,
            description:
              "The element's alignment is determined by its parent's align-items property.",
            value: "auto",
          },
          {
            child: <AlignSelfStartIcon />,
            description: `The element is aligned at the start of the ${axisName}.`,
            value: startValue,
          },
          {
            child: <AlignSelfCenterIcon />,
            description: `The element is centered along the ${axisName}.`,
            value: "center",
          },
          {
            child: <AlignSelfEndIcon />,
            description: `The element is aligned at the end of the ${axisName}.`,
            value: endValue,
          },
          {
            child: <AlignSelfStretchIcon />,
            description: `The element is stretched to fill the entire ${axisName}.`,
            value: "stretch",
          },
          {
            child: <AlignSelfBaselineIcon />,
            description:
              "The element is aligned to the baseline of the parent.",
            value: "baseline",
          },
        ]}
      />
    </Grid>
  );
};

export const JustifySelfControl = () => {
  return (
    <Grid css={{ gridTemplateColumns: "3fr 8fr" }}>
      <PropertyLabel
        label="Justify"
        description={propertyDescriptions.justifySelf}
        properties={["justify-self"]}
      />
      <ToggleGroupControl
        label="Justify"
        properties={["justify-self"]}
        items={[
          {
            child: <XSmallIcon />,
            description:
              "The element's justification is determined by its parent's justify-items property.",
            value: "auto",
          },
          {
            child: (
              <AlignSelfStartIcon style={{ transform: "rotate(-90deg)" }} />
            ),
            description:
              "The element is aligned at the start of the inline axis.",
            value: "start",
          },
          {
            child: (
              <AlignSelfCenterIcon style={{ transform: "rotate(-90deg)" }} />
            ),
            description: "The element is centered along the inline axis.",
            value: "center",
          },
          {
            child: <AlignSelfEndIcon style={{ transform: "rotate(-90deg)" }} />,
            description:
              "The element is aligned at the end of the inline axis.",
            value: "end",
          },
          {
            child: (
              <AlignSelfStretchIcon style={{ transform: "rotate(-90deg)" }} />
            ),
            description:
              "The element is stretched to fill the entire inline axis.",
            value: "stretch",
          },
          {
            child: (
              <AlignSelfBaselineIcon style={{ transform: "rotate(-90deg)" }} />
            ),
            description:
              "The element is aligned to the baseline of the parent.",
            value: "baseline",
          },
        ]}
      />
    </Grid>
  );
};
