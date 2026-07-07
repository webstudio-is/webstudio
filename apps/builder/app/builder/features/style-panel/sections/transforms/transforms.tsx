import { forwardRef, type ElementRef, type ComponentProps } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { toValue, type CssProperty } from "@webstudio-is/css-engine";
import {
  isHtmlReplacedElementTag,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import {
  Box,
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
import { useReadonly } from "../../shared/readonly";
import { humanizeString } from "~/shared/string-utils";
import { getDots } from "../../shared/style-section";
import {
  getPriorityStyleValueSource,
  PropertyLabel,
  PropertySectionLabel,
} from "../../property-label";
import {
  $instanceTags,
  useComputedStyleDecl,
  useComputedStyles,
} from "../../shared/model";
import { createBatchUpdate } from "../../shared/use-style-data";
import { $selectedInstance } from "~/shared/nano-states";
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

const transformUnavailableTooltip =
  "Transforms don't work on display: inline. Change display to inline-block or block.";

const $selectedInstanceTag = computed(
  [$selectedInstance, $instanceTags],
  (selectedInstance, instanceTags) => {
    if (selectedInstance === undefined) {
      return;
    }
    return instanceTags.get(selectedInstance.id);
  }
);

const isTransformUnavailable = ({
  display,
  tag,
}: {
  display: string;
  tag: string | undefined;
}) => {
  if (display === "table-column" || display === "table-column-group") {
    return true;
  }
  if (display === "inline") {
    return tag === undefined || isHtmlReplacedElementTag(tag) === false;
  }
  return false;
};

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
  ComponentProps<"button"> & { unavailable?: boolean }
>(({ unavailable, ...props }, ref) => {
  const readonly = useReadonly();
  const styles = useComputedStyles(advancedProperties);
  const styleValueSourceColor = getPriorityStyleValueSource(styles);
  return (
    <Tooltip content="Advanced transform options">
      <IconButton
        {...props}
        ref={ref}
        variant={styleValueSourceColor}
        disabled={readonly || unavailable}
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

const TransformAdvancedPopover = ({
  unavailable,
}: {
  unavailable?: boolean;
}) => {
  const readonly = useReadonly();
  return (
    <FloatingPanel
      title="Advanced Transform"
      placement="bottom-within"
      content={
        <Grid
          gap="2"
          css={{
            padding: theme.panel.padding,
          }}
        >
          <Grid css={{ gridTemplateColumns: `2fr 1fr` }}>
            <PropertyLabel
              label="Backface Visibility"
              description={propertyDescriptions.backfaceVisibility}
              properties={["backface-visibility"]}
            />
            <TextControl property="backface-visibility" disabled={readonly} />
          </Grid>
          <TransformAndPerspectiveOrigin
            property="transform-origin"
            disabled={readonly}
          />
          <Grid css={{ gridTemplateColumns: `2fr 1fr` }}>
            <PropertyLabel
              label="Perspective"
              description={propertyDescriptions.perspective}
              properties={["perspective"]}
            />
            <TextControl property="perspective" disabled={readonly} />
          </Grid>
          <TransformAndPerspectiveOrigin
            property="perspective-origin"
            disabled={readonly}
          />
        </Grid>
      }
    >
      <TransformAdvancedButton unavailable={unavailable || readonly} />
    </FloatingPanel>
  );
};

export const Section = () => {
  const [isOpen, setIsOpen] = useOpenState(label);
  const readonly = useReadonly();
  const tag = useStore($selectedInstanceTag);
  const display = toValue(useComputedStyleDecl("display").computedValue);
  // Transform applies to transformable elements. The spec excludes
  // non-replaced inline boxes, table-column boxes, and table-column-group boxes.
  // https://drafts.csswg.org/css-transforms-1/#transformable-element
  const unavailable = isTransformUnavailable({ display, tag });
  const controlsDisabled = unavailable || readonly;

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
      isOpen={unavailable ? false : isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          inactive={unavailable || dots.length === 0}
          collapsible={unavailable ? false : dots.length !== 0}
          dots={dots}
          suffix={
            <Flex gap="1" align="center">
              <TransformAdvancedPopover unavailable={unavailable} />
              {unavailable ? (
                <Tooltip
                  content={transformUnavailableTooltip}
                  variant="wrapped"
                >
                  <Box>
                    <SectionTitleButton disabled prefix={<PlusIcon />} />
                  </Box>
                </Tooltip>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SectionTitleButton
                      disabled={controlsDisabled}
                      prefix={<PlusIcon />}
                    />
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
              )}
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
  const readonly = useReadonly();
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
        <Flex
          direction="column"
          css={{
            padding: theme.panel.padding,
          }}
        >
          {panel === "translate" && (
            <TranslatePanelContent disabled={readonly} />
          )}
          {panel === "scale" && <ScalePanelContent disabled={readonly} />}
          {panel === "rotate" && <RotatePanelContent disabled={readonly} />}
          {panel === "skew" && <SkewPanelContent disabled={readonly} />}
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
              disabled={readonly}
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
              disabled={readonly}
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
