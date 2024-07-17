import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { useState } from "react";
import {
  CssValueListArrowFocus,
  CssValueListItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  Label,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
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
  useHumaneTransformPropertyValues,
  isTransformPanelPropertyExists,
  handleDeleteTransformProperty,
  handleHideTransformProperty,
} from "./utils";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransformPanelContent } from "./transform-panel";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { humanizeString } from "~/shared/string-utils";

export const transformPanels = [
  "translate",
  "scale",
  "rotate",
  "skew",
] as const;

export type TransformPanel = (typeof transformPanels)[number];

const label = "Transforms";
export const properties = [
  "translate",
  "scale",
  "transform",
] satisfies Array<StyleProperty>;

// @todo: How do we calculate the styleSource value for showing the blue-label.
// Should we consider one of the following properties or a common denominator of all the properties.

export const Section = (props: SectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (isFeatureEnabled("transforms") === false) {
    return;
  }

  return (
    <CollapsibleSectionRoot
      fullWidth
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          suffix={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SectionTitleButton prefix={<PlusIcon />}></SectionTitleButton>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent
                  collisionPadding={16}
                  css={{ width: theme.spacing[20] }}
                >
                  {transformPanels.map((panel) => {
                    return (
                      <DropdownMenuItem
                        disabled={
                          isTransformPanelPropertyExists({
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
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>
      }
    >
      <CssValueListArrowFocus>
        {transformPanels.map((panel, index) => (
          <TransformSection
            {...props}
            key={panel}
            index={index}
            panel={panel}
          />
        ))}
      </CssValueListArrowFocus>
    </CollapsibleSectionRoot>
  );
};

const TransformSection = (
  props: SectionProps & { index: number; panel: TransformPanel }
) => {
  const { currentStyle, setProperty, deleteProperty, panel, index } = props;
  const properties = useHumaneTransformPropertyValues({ currentStyle, panel });
  if (properties === undefined) {
    return;
  }

  return (
    <FloatingPanel
      title={humanizeString(panel)}
      content={
        <TransformPanelContent
          panel={panel}
          setProperty={setProperty}
          propertyValue={properties.value}
        />
      }
    >
      <CssValueListItem
        id={label}
        index={index}
        hidden={properties.value.hidden}
        label={<Label truncate>{properties.name}</Label>}
        buttons={
          <>
            <SmallToggleButton
              variant="normal"
              pressed={properties.value.hidden}
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
