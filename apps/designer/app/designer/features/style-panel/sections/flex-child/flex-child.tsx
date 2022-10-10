import { useState } from "react";
import { Text, Flex, Grid, ModalPopover } from "@webstudio-is/design-system";
import type { RenderCategoryProps } from "../../style-sections";
import { ToggleGroupControl } from "../../controls";
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

export const FlexChildSection = ({
  setProperty,
  createBatchUpdate,
  currentStyle,
  sectionStyle,
}: RenderCategoryProps) => {
  const setAlignSelf = setProperty("alignSelf");
  const setOrder = setProperty("order");
  const setSizing = createBatchUpdate();

  return (
    <Flex css={{ flexDirection: "column", gap: "$2" }}>
      <Grid css={{ gridTemplateColumns: "4fr auto" }}>
        <PropertyName
          property={sectionStyle.alignSelf?.styleConfig.property}
          label="Align"
        />
        <ToggleGroupControl
          onValueChange={(value) => setAlignSelf(value)}
          value={String(currentStyle.alignSelf?.value)}
          items={[
            {
              child: <CrossSmallIcon />,
              label: "Do not align items",
              value: "auto",
            },
            {
              child: <AlignSelfStartIcon />,
              label: "align-items: flex-start",
              value: "start",
            },
            {
              child: <AlignSelfEndIcon />,
              label: "align-items: flex-end",
              value: "end",
            },
            {
              child: <AlignSelfCenterIcon />,
              label: "align-items: center",
              value: "center",
            },
            {
              child: <AlignSelfStretchIcon />,
              label: "align-items: stretch",
              value: "stretch",
            },
            {
              child: <AlignSelfBaselineIcon />,
              label: "align-items: baseline",
              value: "baseline",
            },
          ]}
        />
      </Grid>
      <Grid css={{ gridTemplateColumns: "4fr auto" }}>
        <PropertyName
          property={sectionStyle.flexGrow?.styleConfig.property}
          label="Sizing"
        />
        <ToggleGroupControl
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
          value={(() => {
            switch (
              String(currentStyle.flexGrow?.value) +
              String(currentStyle.flexShrink?.value)
            ) {
              case "00": {
                return "none";
              }
              case "10": {
                return "grow";
              }
              case "01": {
                return "shrink";
              }
              default: {
                return "";
              }
            }
          })()}
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
              child: (
                <ModalPopover
                  title="Sizing"
                  content={
                    <Grid
                      css={{
                        gridTemplateColumns: "1.5fr 1fr 1fr",
                        gap: "$3",
                        padding: "$3",
                      }}
                    >
                      <Grid css={{ gridTemplateColumns: "auto", gap: "$1" }}>
                        <PropertyName
                          property={
                            sectionStyle.flexBasis?.styleConfig.property
                          }
                          label="Basis"
                        />
                        <TextControl {...sectionStyle.flexBasis} />
                      </Grid>
                      <Grid css={{ gridTemplateColumns: "auto", gap: "$1" }}>
                        <PropertyName
                          property={sectionStyle.flexGrow?.styleConfig.property}
                          label="Grow"
                        />
                        <TextControl {...sectionStyle.flexGrow} />
                      </Grid>
                      <Grid css={{ gridTemplateColumns: "auto", gap: "$1" }}>
                        <PropertyName
                          property={
                            sectionStyle.flexShrink?.styleConfig.property
                          }
                          label="Shrink"
                        />
                        <TextControl {...sectionStyle.flexShrink} />
                      </Grid>
                    </Grid>
                  }
                >
                  <EllipsesIcon />
                </ModalPopover>
              ),
              label: "More sizing options",
              value: "",
            },
          ]}
        />
      </Grid>
      <Grid css={{ gridTemplateColumns: "4fr auto" }}>
        <PropertyName
          property={sectionStyle.order?.styleConfig.property}
          label="Order"
        />
        <ToggleGroupControl
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
              child: (
                <ModalPopover
                  title="Order"
                  content={
                    <Grid css={{ padding: "$3" }}>
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
                  <EllipsesIcon />
                </ModalPopover>
              ),
              label: "Customize order",
              value: "",
            },
          ]}
        />
      </Grid>
    </Flex>
  );
};
