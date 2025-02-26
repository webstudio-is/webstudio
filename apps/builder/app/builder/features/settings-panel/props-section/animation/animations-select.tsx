import { useState, useMemo } from "react";
import {
  theme,
  IconButton,
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
  Text,
  Label,
  Grid,
  useSortable,
  CssValueListArrowFocus,
  toast,
  FloatingPanel,
  InputField,
  DialogTitle,
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

import { animationActionSchema } from "@webstudio-is/sdk";
import { newScrollAnimations } from "./new-scroll-animations";
import { newViewAnimations } from "./new-view-animations";
import { useIds } from "~/shared/form-utils";
import { AnimationPanelContent } from "./animation-panel-content";

const newAnimationsPerType: {
  scroll: ScrollAnimation[];
  view: ViewAnimation[];
} = {
  scroll: newScrollAnimations,
  view: newViewAnimations,
};

type Props = {
  value: AnimationAction;
  onChange: (value: AnimationAction) => void;
};

const floatingPanelOffset = { alignmentAxis: -100 };

export const AnimationsSelect = ({ value, onChange }: Props) => {
  const fieldIds = useIds(["addAnimation"] as const);

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
      const parsedValue = animationActionSchema.safeParse(newValue);

      if (parsedValue.success) {
        onChange(parsedValue.data);
        return;
      }
      toast.error("Failed to sort animation");
    },
  });

  const handleChange = (newValue: unknown) => {
    const parsedValue = animationActionSchema.safeParse(newValue);

    if (parsedValue.success) {
      onChange(parsedValue.data);
      return;
    }
    toast.error("Failed to add animation");
  };

  return (
    <Grid gap={1} align={"center"} css={{ gridTemplateColumns: "1fr auto" }}>
      <Label htmlFor={fieldIds.addAnimation}>
        <Text variant={"titles"}>Animations</Text>
      </Label>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton id={fieldIds.addAnimation}>
            <PlusIcon />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          sideOffset={Number.parseFloat(rawTheme.spacing[5])}
          css={{ width: theme.spacing[25] }}
        >
          {newAnimations.map((animation, index) => (
            <DropdownMenuItem
              key={index}
              onSelect={() => {
                handleChange({
                  ...value,
                  animations: value.animations.concat(animation),
                });
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
              {newAnimationHint ?? "Add new or select existing animation"}
            </Box>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CssValueListArrowFocus dragItemId={dragItemId}>
        <Grid gap={1} css={{ gridColumn: "span 2" }} ref={sortableRefCallback}>
          {value.animations.map((animation, index) => (
            <FloatingPanel
              key={index}
              title={
                <DialogTitle css={{ paddingLeft: theme.spacing[6] }}>
                  <InputField
                    css={{
                      width: "100%",
                      fontWeight: `inherit`,
                    }}
                    variant="chromeless"
                    value={animation.name}
                    autoFocus={true}
                    placeholder="Enter animation name"
                    onChange={(event) => {
                      const name = event.currentTarget.value;
                      const newAnimations = [...value.animations];
                      newAnimations[index] = { ...animation, name };

                      const newValue = {
                        ...value,
                        animations: newAnimations,
                      };

                      handleChange(newValue);
                    }}
                  />
                </DialogTitle>
              }
              content={
                <AnimationPanelContent
                  type={value.type}
                  value={animation}
                  onChange={(animation) => {
                    const newAnimations = [...value.animations];
                    newAnimations[index] = animation;
                    const newValue = {
                      ...value,
                      animations: newAnimations,
                    };
                    handleChange(newValue);
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
                hidden={false}
                draggable
                active={dragItemId === String(index)}
                state={undefined}
                index={index}
                id={String(index)}
                buttons={
                  <>
                    <SmallToggleButton
                      pressed={false}
                      onPressedChange={() => {
                        alert("Not implemented");
                      }}
                      variant="normal"
                      tabIndex={-1}
                      icon={
                        // eslint-disable-next-line no-constant-condition
                        false ? <EyeClosedIcon /> : <EyeOpenIcon />
                      }
                    />

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
                        handleChange(newValue);
                      }}
                    />
                  </>
                }
              />
            </FloatingPanel>
          ))}
          {placementIndicator}
        </Grid>
      </CssValueListArrowFocus>
    </Grid>
  );
};
