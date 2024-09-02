import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { useMemo, useState } from "react";
import {
  CssValueListArrowFocus,
  CssValueListItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  Flex,
  Label,
  SectionTitle,
  SectionTitleButton,
  SmallIconButton,
  SmallToggleButton,
  theme,
} from "@webstudio-is/design-system";
import {
  EyeconClosedIcon,
  PlusIcon,
  SubtractIcon,
  EyeconOpenIcon,
} from "@webstudio-is/icons";
import {
  addDefaultsForTransormSection,
  isTransformPanelPropertyUsed,
  handleDeleteTransformProperty,
  handleHideTransformProperty,
  getHumanizedTextFromTransformLayer,
  type TransformPanelProps,
} from "./transform-utils";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TranslatePanelContent } from "./transform-translate";
import { ScalePanelContent } from "./transform-scale";
import { RotatePanelContent } from "./transform-rotate";
import { SkewPanelContent } from "./transform-skew";
import { BackfaceVisibility } from "./transform-backface-visibility";
import { TransformPerspective } from "./transform-perspective";
import { humanizeString } from "~/shared/string-utils";
import { getDots } from "../../shared/collapsible-section";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { TransformAndPerspectiveOrigin } from "./transform-and-perspective-origin";
import { PropertySectionLabel } from "../../property-label";
import { propertyDescriptions } from "@webstudio-is/css-data";

export const transformPanels = [
  "translate",
  "scale",
  "rotate",
  "skew",
] as const;

export const transformPanelDropdown = [
  ...transformPanels,
  "backfaceVisibility",
  "transformOrigin",
  "perspective",
  "perspectiveOrigin",
] as const;

export type TransformPanel = (typeof transformPanels)[number];

const label = "Transforms";
export const properties = [
  "translate",
  "scale",
  "transform",
  "transformOrigin",
  "backfaceVisibility",
  "perspective",
  "perspectiveOrigin",
] satisfies [StyleProperty, ...StyleProperty[]];

export const Section = (props: SectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (isFeatureEnabled("transforms") === false) {
    return;
  }

  const { currentStyle } = props;

  const isAnyTransformPropertyAdded = transformPanels.some((panel) =>
    isTransformPanelPropertyUsed({
      currentStyle: props.currentStyle,
      panel,
    })
  );

  return (
    <CollapsibleSectionRoot
      fullWidth
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          dots={getDots(currentStyle, properties)}
          suffix={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SectionTitleButton prefix={<PlusIcon />}></SectionTitleButton>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent
                  collisionPadding={16}
                  css={{ width: theme.spacing[24] }}
                >
                  {transformPanelDropdown.map((panel) => {
                    return (
                      <DropdownMenuItem
                        disabled={
                          isTransformPanelPropertyUsed({
                            currentStyle: props.currentStyle,
                            panel,
                          }) === true
                        }
                        key={panel}
                        onSelect={() => {
                          addDefaultsForTransormSection({
                            currentStyle: props.currentStyle,
                            setProperty: props.setProperty,
                            panel,
                          });
                          setIsOpen(true);
                        }}
                      >
                        {humanizeString(panel)}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          }
        >
          <PropertySectionLabel
            label={label}
            description={propertyDescriptions.transform}
            properties={properties}
          />
        </SectionTitle>
      }
    >
      {isAnyTransformPropertyAdded === true ? (
        <CssValueListArrowFocus>
          <Flex direction="column">
            {transformPanels.map((panel, index) => (
              <TransformSection
                {...props}
                key={panel}
                index={index}
                panel={panel}
              />
            ))}
          </Flex>
        </CssValueListArrowFocus>
      ) : undefined}

      <BackfaceVisibility />
      <TransformAndPerspectiveOrigin property="transformOrigin" {...props} />
      <TransformPerspective />
      <TransformAndPerspectiveOrigin property="perspectiveOrigin" {...props} />
    </CollapsibleSectionRoot>
  );
};

const TransformSection = (
  props: SectionProps & { index: number; panel: TransformPanel }
) => {
  const { currentStyle, setProperty, deleteProperty, panel, index } = props;
  const properties = useMemo(() => {
    const property =
      panel === "rotate" || panel === "skew" ? "transform" : panel;
    const value = currentStyle[property]?.value;

    if (value === undefined || value.type !== "tuple") {
      return;
    }

    return getHumanizedTextFromTransformLayer(panel, value);
  }, [currentStyle, panel]);

  if (properties === undefined) {
    return;
  }

  const contentPanelProps: TransformPanelProps = {
    currentStyle,
    setProperty,
    deleteProperty,
    propertyValue: properties.value,
  };

  return (
    <FloatingPanel
      title={humanizeString(panel)}
      content={
        <Flex direction="column" css={{ p: theme.spacing[9] }}>
          {panel === "translate" && (
            <TranslatePanelContent {...contentPanelProps} />
          )}
          {panel === "scale" && <ScalePanelContent {...contentPanelProps} />}
          {panel === "rotate" && <RotatePanelContent {...contentPanelProps} />}
          {panel === "skew" && <SkewPanelContent {...contentPanelProps} />}
        </Flex>
      }
    >
      <CssValueListItem
        id={panel}
        index={index}
        hidden={properties.value.hidden}
        label={<Label truncate>{properties.label}</Label>}
        buttons={
          <>
            <SmallToggleButton
              variant="normal"
              pressed={properties.value.hidden}
              tabIndex={-1}
              onPressedChange={() =>
                handleHideTransformProperty({
                  currentStyle,
                  setProperty,
                  panel,
                })
              }
              icon={
                properties.value.hidden ? (
                  <EyeconClosedIcon />
                ) : (
                  <EyeconOpenIcon />
                )
              }
            />
            <SmallIconButton
              variant="destructive"
              tabIndex={-1}
              disabled={properties.value.hidden}
              icon={<SubtractIcon />}
              onClick={() =>
                handleDeleteTransformProperty({
                  currentStyle,
                  setProperty,
                  deleteProperty,
                  panel,
                })
              }
            />
          </>
        }
      ></CssValueListItem>
    </FloatingPanel>
  );
};
