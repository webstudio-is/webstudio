import { forwardRef, type ElementRef, type ComponentProps } from "react";
import type { CssProperty } from "@webstudio-is/css-engine";
import { propertyDescriptions } from "@webstudio-is/css-data";
import {
  CssValueListArrowFocus,
  CssValueListItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  Grid,
  IconButton,
  Label,
  SectionTitle,
  SectionTitleButton,
  SmallIconButton,
  SmallToggleButton,
  theme,
  Tooltip,
  FloatingPanel,
} from "@webstudio-is/design-system";
import {
  EyeClosedIcon,
  PlusIcon,
  MinusIcon,
  EyeOpenIcon,
  EllipsesIcon,
} from "@webstudio-is/icons";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { humanizeString } from "~/shared/string-utils";
import { getDots } from "../../shared/style-section";
import {
  getPriorityStyleValueSource,
  PropertyLabel,
  PropertySectionLabel,
} from "../../property-label";
import { useComputedStyleDecl, useComputedStyles } from "../../shared/model";
import { createBatchUpdate } from "../../shared/use-style-data";
import { TextControl } from "../../controls";
import {
  addDefaultsForTransormSection,
  isTransformPanelPropertyUsed,
  handleDeleteTransformProperty,
  handleHideTransformProperty,
  getHumanizedTextFromTransformLayer,
  transformPanels,
  type TransformPanel,
} from "./transform-utils";
import { TranslatePanelContent } from "./transform-translate";
import { ScalePanelContent } from "./transform-scale";
import { RotatePanelContent } from "./transform-rotate";
import { SkewPanelContent } from "./transform-skew";
import { TransformAndPerspectiveOrigin } from "./transform-and-perspective-origin";

const label = "Transforms";

const advancedProperties = [
  "transform-origin",
  "backface-visibility",
  "perspective",
  "perspective-origin",
] satisfies [CssProperty, ...CssProperty[]];

export const properties = [
  "transform",
  "translate",
  "scale",
  ...advancedProperties,
] satisfies [CssProperty, ...CssProperty[]];

const TransformAdvancedButton = forwardRef<
  ElementRef<"button">,
  ComponentProps<"button">
>((props, ref) => {
  const styles = useComputedStyles(advancedProperties);
  const styleValueSourceColor = getPriorityStyleValueSource(styles);
  return (
    <Tooltip content="Advanced transform options">
      <IconButton
        {...props}
        ref={ref}
        variant={styleValueSourceColor}
        onClick={(event) => {
          if (event.altKey) {
            const batch = createBatchUpdate();
            for (const property of advancedProperties) {
              batch.deleteProperty(property);
            }
            batch.publish();
            return;
          }
          props.onClick?.(event);
        }}
      >
        <EllipsesIcon />
      </IconButton>
    </Tooltip>
  );
});

const TransformAdvancedPopover = () => {
  return (
    <FloatingPanel
      title="Advanced Transform"
      placement="bottom"
      content={
        <Grid gap="2" css={{ padding: theme.panel.padding }}>
          <Grid css={{ gridTemplateColumns: `2fr 1fr` }}>
            <PropertyLabel
              label="Backface Visibility"
              description={propertyDescriptions.backfaceVisibility}
              properties={["backface-visibility"]}
            />
            <TextControl property="backface-visibility" />
          </Grid>
          <TransformAndPerspectiveOrigin property="transform-origin" />
          <Grid css={{ gridTemplateColumns: `2fr 1fr` }}>
            <PropertyLabel
              label="Perspective"
              description={propertyDescriptions.perspective}
              properties={["perspective"]}
            />
            <TextControl property="perspective" />
          </Grid>
          <TransformAndPerspectiveOrigin property="perspective-origin" />
        </Grid>
      }
    >
      <TransformAdvancedButton />
    </FloatingPanel>
  );
};

export const Section = () => {
  const [isOpen, setIsOpen] = useOpenState(label);

  const styles = useComputedStyles(properties);
  const isAnyTransformPropertyAdded = transformPanels.some((panel) =>
    isTransformPanelPropertyUsed({
      panel,
      styles,
    })
  );
  const dots = getDots(styles);

  return (
    <CollapsibleSectionRoot
      fullWidth
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          inactive={dots.length === 0}
          collapsible={dots.length !== 0}
          dots={dots}
          suffix={
            <Flex gap="1" align="center">
              <TransformAdvancedPopover />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SectionTitleButton
                    prefix={<PlusIcon />}
                  ></SectionTitleButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  collisionPadding={16}
                  css={{ width: theme.spacing[24] }}
                >
                  {transformPanels.map((panel) => (
                    <DropdownMenuItem
                      disabled={isTransformPanelPropertyUsed({
                        panel,
                        styles,
                      })}
                      key={panel}
                      onSelect={() => {
                        addDefaultsForTransormSection({
                          panel,
                          styles,
                        });
                        setIsOpen(true);
                      }}
                    >
                      {humanizeString(panel)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </Flex>
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
      {isAnyTransformPropertyAdded && (
        <CssValueListArrowFocus>
          <Flex direction="column">
            {transformPanels.map(
              (panel, index) =>
                isTransformPanelPropertyUsed({
                  panel,
                  styles,
                }) && (
                  <TransformSection key={panel} index={index} panel={panel} />
                )
            )}
          </Flex>
        </CssValueListArrowFocus>
      )}
    </CollapsibleSectionRoot>
  );
};

const TransformSection = ({
  panel,
  index,
}: {
  index: number;
  panel: TransformPanel;
}) => {
  const property = panel === "rotate" || panel === "skew" ? "transform" : panel;
  const styleDecl = useComputedStyleDecl(property);
  const values = getHumanizedTextFromTransformLayer(
    panel,
    styleDecl.cascadedValue
  );
  if (values === undefined) {
    return;
  }
  const { value, label } = values;

  return (
    <FloatingPanel
      title={humanizeString(panel)}
      content={
        <Flex direction="column" css={{ padding: theme.panel.padding }}>
          {panel === "translate" && <TranslatePanelContent />}
          {panel === "scale" && <ScalePanelContent />}
          {panel === "rotate" && <RotatePanelContent />}
          {panel === "skew" && <SkewPanelContent />}
        </Flex>
      }
    >
      <CssValueListItem
        id={panel}
        index={index}
        hidden={value.hidden}
        label={<Label truncate>{label}</Label>}
        buttons={
          <>
            <SmallToggleButton
              variant="normal"
              pressed={value.hidden}
              tabIndex={-1}
              onPressedChange={() =>
                handleHideTransformProperty({
                  panel,
                  value: styleDecl.cascadedValue,
                })
              }
              icon={value.hidden ? <EyeClosedIcon /> : <EyeOpenIcon />}
            />
            <SmallIconButton
              variant="destructive"
              tabIndex={-1}
              icon={<MinusIcon />}
              onClick={() =>
                handleDeleteTransformProperty({
                  panel,
                  value: styleDecl.cascadedValue,
                })
              }
            />
          </>
        }
      ></CssValueListItem>
    </FloatingPanel>
  );
};
