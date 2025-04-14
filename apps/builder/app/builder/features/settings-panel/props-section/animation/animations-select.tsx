import { useState, useMemo, type ReactNode } from "react";
import {
  theme,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  rawTheme,
  CssValueListItem,
  SmallToggleButton,
  SmallIconButton,
  Box,
  Label,
  Grid,
  useSortable,
  CssValueListArrowFocus,
  FloatingPanel,
  DialogTitle,
  Tooltip,
  SectionTitleButton,
  SectionTitle,
  SectionTitleLabel,
  Flex,
} from "@webstudio-is/design-system";
import {
  EyeClosedIcon,
  EyeOpenIcon,
  MinusIcon,
  PlusIcon,
} from "@webstudio-is/icons";
import type {
  AnimationAction,
  ScrollAnimation,
  ViewAnimation,
} from "@webstudio-is/sdk";
import { newScrollAnimations } from "./new-scroll-animations";
import { newViewAnimations } from "./new-view-animations";
import { AnimationPanelContent } from "./animation-panel-content";
import { CollapsibleSectionRoot } from "~/builder/shared/collapsible-section";

const newAnimationsPerType: {
  scroll: ScrollAnimation[];
  view: ViewAnimation[];
} = {
  scroll: newScrollAnimations,
  view: newViewAnimations,
};

type AnimationsSelectProps = {
  action?: ReactNode;
  value: AnimationAction;
  onChange: ((value: unknown, isEphemeral: boolean) => void) &
    ((value: undefined, isEphemeral: true) => void);
  isAnimationEnabled: (
    enabled: [breakpointId: string, enabled: boolean][] | undefined
  ) => boolean | undefined;
  selectedBreakpointId: string;
};

const floatingPanelOffset = { alignmentAxis: -100 };

export const AnimationsSelect = ({
  action,
  value,
  onChange,
  isAnimationEnabled,
  selectedBreakpointId,
}: AnimationsSelectProps) => {
  const [newAnimationHint, setNewAnimationHint] = useState<string | undefined>(
    undefined
  );

  const newAnimations = newAnimationsPerType[value.type];

  const sortableItems = useMemo(
    () => value.animations.map((_, index) => ({ id: `${index}`, index })),
    [value.animations]
  );

  const { dragItemId, placementIndicator, sortableRefCallback } = useSortable({
    items: sortableItems,
    onSort: (newIndex, oldIndex) => {
      const newAnimations = [...value.animations];
      const [movedItem] = newAnimations.splice(oldIndex, 1);
      newAnimations.splice(newIndex, 0, movedItem);
      const newValue = { ...value, animations: newAnimations };
      onChange(newValue, false);
    },
  });

  const handleChange = (newValue: unknown, isEphemeral: boolean) => {
    onChange(newValue, isEphemeral);
  };

  return (
    <CollapsibleSectionRoot
      isOpen
      fullWidth
      trigger={
        <SectionTitle
          collapsible={false}
          suffix={
            <Flex gap="1" align="center">
              {action}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SectionTitleButton prefix={<PlusIcon />} tabIndex={0} />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  sideOffset={Number.parseFloat(rawTheme.spacing[5])}
                  css={{ width: theme.spacing[25] }}
                >
                  {newAnimations.map((animation, index) => (
                    <DropdownMenuItem
                      key={index}
                      onSelect={() => {
                        handleChange(
                          {
                            ...value,
                            animations: value.animations.concat(animation),
                          },
                          false
                        );
                      }}
                      onFocus={() => setNewAnimationHint(animation.description)}
                      onBlur={() => setNewAnimationHint(undefined)}
                    >
                      {animation.name}
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem css={{ display: "grid" }} hint>
                    {newAnimations.map(({ description }, index) => (
                      <Box
                        css={{
                          gridColumn: "1",
                          gridRow: "1",
                          visibility: "hidden",
                        }}
                        key={index}
                      >
                        {description}
                      </Box>
                    ))}
                    <Box
                      css={{
                        gridColumn: "1",
                        gridRow: "1",
                      }}
                    >
                      {newAnimationHint ??
                        "Add new or select existing animation"}
                    </Box>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Flex>
          }
        >
          <SectionTitleLabel>Animations</SectionTitleLabel>
        </SectionTitle>
      }
    >
      <CssValueListArrowFocus dragItemId={dragItemId}>
        <Grid gap={1} css={{ gridColumn: "span 2" }} ref={sortableRefCallback}>
          {value.animations.map((animation, index) => {
            const isEnabled = isAnimationEnabled(animation.enabled) ?? true;

            return (
              <FloatingPanel
                key={index}
                title={
                  <DialogTitle css={{ paddingLeft: theme.spacing[6] }}>
                    {animation.name}
                  </DialogTitle>
                }
                content={
                  <AnimationPanelContent
                    type={value.type}
                    value={animation}
                    onChange={(animation, isEphemeral) => {
                      if (animation === undefined) {
                        // Reset ephemeral state
                        handleChange(undefined, true);
                        return;
                      }

                      const newAnimations = [...value.animations];
                      newAnimations[index] = animation;
                      const newValue = {
                        ...value,
                        animations: newAnimations,
                      };
                      handleChange(newValue, isEphemeral);
                    }}
                  />
                }
                offset={floatingPanelOffset}
              >
                <CssValueListItem
                  key={index}
                  label={
                    <Label disabled={false} truncate>
                      {animation.name ?? "Unnamed"}
                    </Label>
                  }
                  hidden={!isEnabled}
                  draggable
                  active={dragItemId === String(index)}
                  state={undefined}
                  index={index}
                  id={String(index)}
                  buttons={
                    <>
                      <Tooltip
                        content={
                          isEnabled
                            ? "Disable animation at breakpoint"
                            : "Enable animation at breakpoint"
                        }
                      >
                        <SmallToggleButton
                          pressed={!isEnabled}
                          onPressedChange={() => {
                            const enabledMap = new Map(animation.enabled);
                            enabledMap.set(selectedBreakpointId, !isEnabled);

                            const enabled = [...enabledMap];

                            const newAnimations = [...value.animations];
                            const newAnimation = {
                              ...animation,
                              enabled: enabled.every(([_, enabled]) => enabled)
                                ? undefined
                                : [...enabledMap],
                            };

                            newAnimations[index] = newAnimation;

                            const newValue = {
                              ...value,
                              animations: newAnimations,
                            };
                            handleChange(newValue, false);
                          }}
                          variant="normal"
                          tabIndex={-1}
                          icon={isEnabled ? <EyeOpenIcon /> : <EyeClosedIcon />}
                        />
                      </Tooltip>

                      <SmallIconButton
                        variant="destructive"
                        tabIndex={-1}
                        icon={<MinusIcon />}
                        onClick={() => {
                          const newAnimations = [...value.animations];
                          newAnimations.splice(index, 1);

                          const newValue = {
                            ...value,
                            animations: newAnimations,
                          };
                          handleChange(newValue, false);
                        }}
                      />
                    </>
                  }
                />
              </FloatingPanel>
            );
          })}
          {placementIndicator}
        </Grid>
      </CssValueListArrowFocus>
    </CollapsibleSectionRoot>
  );
};
