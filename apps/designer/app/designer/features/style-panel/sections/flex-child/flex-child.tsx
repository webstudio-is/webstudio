import { Flex, Grid } from "@webstudio-is/design-system";
import type { RenderCategoryProps } from "../../style-sections";
import { ToggleGroupControl } from "../../controls/toggle/toggle-control";
import { PropertyName } from "../../shared/property-name";
import { TextControl } from "../../controls";
import {
  CrossSmallIcon,
  AlignSelfStartIcon,
  AlignSelfEndIcon,
  AlignSelfCenterIcon,
  AlignSelfBaselineIcon,
  AlignSelfStretchIcon,
  FlexSizingShrinkIcon,
  FlexSizingGrowIcon,
  OrderFirstIcon,
  OrderLastIcon,
  EllipsesIcon,
} from "@webstudio-is/icons";
import { ValuePickerPopover } from "../../shared/value-picker-popover";

export const FlexChildSection = (props: RenderCategoryProps) => {
  return (
    <Flex css={{ flexDirection: "column", gap: "$spacing$5" }}>
      <FlexChildSectionAlign {...props} />
      <FlexChildSectionSizing {...props} />
      <FlexChildSectionOrder {...props} />
    </Flex>
  );
};

const FlexChildSectionAlign = (props: RenderCategoryProps) => {
  const { setProperty, currentStyle, sectionStyle } = props;
  const setAlignSelf = setProperty("alignSelf");

  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyName
        property={sectionStyle.alignSelf?.styleConfig.property}
        label="Align"
      />
      <ToggleGroupControl
        property={sectionStyle.alignSelf?.styleConfig.property}
        onValueChange={(value) => setAlignSelf(value)}
        value={String(currentStyle.alignSelf?.value)}
        items={[
          {
            child: <CrossSmallIcon />,
            label: "Do not align self",
            value: "auto",
          },
          {
            child: <AlignSelfStartIcon />,
            label: "align-self: flex-start",
            value: "start",
          },
          {
            child: <AlignSelfEndIcon />,
            label: "align-self: flex-end",
            value: "end",
          },
          {
            child: <AlignSelfCenterIcon />,
            label: "align-self: center",
            value: "center",
          },
          {
            child: <AlignSelfStretchIcon />,
            label: "align-self: stretch",
            value: "stretch",
          },
          {
            child: <AlignSelfBaselineIcon />,
            label: "align-self: baseline",
            value: "baseline",
          },
        ]}
      />
    </Grid>
  );
};

const FlexChildSectionSizing = (props: RenderCategoryProps) => {
  const { createBatchUpdate, currentStyle, sectionStyle } = props;
  const setSizing = createBatchUpdate();

  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyName
        property={[
          sectionStyle.flexGrow?.styleConfig.property,
          sectionStyle.flexShrink?.styleConfig.property,
        ]}
        label="Sizing"
      />
      <ToggleGroupControl
        property={[
          sectionStyle.flexGrow?.styleConfig.property,
          sectionStyle.flexShrink?.styleConfig.property,
        ]}
        onValueChange={(value) => {
          switch (value) {
            case "none": {
              setSizing.setProperty("flexGrow")("0");
              setSizing.setProperty("flexShrink")("0");
              setSizing.publish();
              break;
            }
            case "grow": {
              setSizing.setProperty("flexGrow")("1");
              setSizing.setProperty("flexShrink")("0");
              setSizing.publish();
              break;
            }
            case "shrink": {
              setSizing.setProperty("flexGrow")("0");
              setSizing.setProperty("flexShrink")("1");
              setSizing.publish();
              break;
            }
          }
        }}
        value={getSizingValue(
          String(currentStyle.flexGrow?.value),
          String(currentStyle.flexShrink?.value)
        )}
        items={[
          {
            child: <CrossSmallIcon />,
            label: "Don't grow or shrink",
            value: "none",
          },
          {
            child: <FlexSizingGrowIcon />,
            label: "Grow if possible",
            value: "grow",
          },
          {
            child: <FlexSizingShrinkIcon />,
            label: "Shrink if needed",
            value: "shrink",
          },
          {
            child: <FlexChildSectionSizingPopover {...props} />,
            label: "More sizing options",
            value: "",
          },
        ]}
      />
    </Grid>
  );
};

const FlexChildSectionSizingPopover = ({
  sectionStyle,
}: RenderCategoryProps) => {
  return (
    <ValuePickerPopover
      title="Sizing"
      content={
        <Grid
          css={{
            gridTemplateColumns: "1.5fr 1fr 1fr",
            gap: "$spacing$9",
            padding: "$spacing$9",
          }}
        >
          <Grid css={{ gridTemplateColumns: "auto", gap: "$spacing$3" }}>
            <PropertyName
              property={sectionStyle.flexBasis?.styleConfig.property}
              label="Basis"
            />
            <TextControl {...sectionStyle.flexBasis} />
          </Grid>
          <Grid css={{ gridTemplateColumns: "auto", gap: "$spacing$3" }}>
            <PropertyName
              property={sectionStyle.flexGrow?.styleConfig.property}
              label="Grow"
            />
            <TextControl {...sectionStyle.flexGrow} />
          </Grid>
          <Grid css={{ gridTemplateColumns: "auto", gap: "$spacing$3" }}>
            <PropertyName
              property={sectionStyle.flexShrink?.styleConfig.property}
              label="Shrink"
            />
            <TextControl {...sectionStyle.flexShrink} />
          </Grid>
        </Grid>
      }
    >
      <Flex>
        <EllipsesIcon />
      </Flex>
    </ValuePickerPopover>
  );
};

const FlexChildSectionOrder = (props: RenderCategoryProps) => {
  const { setProperty, currentStyle, sectionStyle } = props;
  const setOrder = setProperty("order");

  return (
    <Grid css={{ gridTemplateColumns: "4fr auto" }}>
      <PropertyName
        property={sectionStyle.order?.styleConfig.property}
        label="Order"
      />
      <ToggleGroupControl
        property={sectionStyle.order?.styleConfig.property}
        onValueChange={(value) => {
          switch (value) {
            case "0":
            case "1":
            case "-1": {
              setOrder(value);
              break;
            }
          }
        }}
        value={String(currentStyle.order?.value)}
        items={[
          {
            child: <CrossSmallIcon />,
            label: "Dont't change",
            value: "0",
          },
          {
            child: <OrderFirstIcon />,
            label: "Make first",
            value: "1",
          },
          {
            child: <OrderLastIcon />,
            label: "Make last",
            value: "-1",
          },
          {
            child: <FlexChildSectionOrderPopover {...props} />,
            label: "Customize order",
            value: "",
          },
        ]}
      />
    </Grid>
  );
};

const FlexChildSectionOrderPopover = (props: RenderCategoryProps) => {
  const { sectionStyle } = props;
  return (
    <ValuePickerPopover
      title="Order"
      content={
        <Grid css={{ padding: "$spacing$9" }}>
          <Grid css={{ gridTemplateColumns: "4fr 6fr" }}>
            <PropertyName
              property={sectionStyle.order?.styleConfig.property}
              label="Order"
            />
            <TextControl {...sectionStyle.order} />
          </Grid>
        </Grid>
      }
    >
      <Flex>
        <EllipsesIcon />
      </Flex>
    </ValuePickerPopover>
  );
};

const getSizingValue = (flexGrow: string, flexShrink: string) => {
  if (flexGrow === "0" && flexShrink === "0") {
    return "none";
  }
  if (flexGrow === "1" && flexShrink === "0") {
    return "grow";
  }
  if (flexGrow === "0" && flexShrink === "1") {
    return "shrink";
  }
  return "";
};
