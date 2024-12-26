import { useState, type ComponentProps, type ReactNode } from "react";
import { css, styled, theme } from "../stitches.config";
import {
  CssValueListArrowFocus,
  CssValueListItem,
  __testing__,
} from "./css-value-list-item";
import { Label, labelColors } from "./label";
import { SmallToggleButton } from "./small-toggle-button";
import { EyeOpenIcon, EyeClosedIcon, MinusIcon } from "@webstudio-is/icons";
import { SmallIconButton } from "./small-icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { StorySection, StoryGrid } from "./storybook";

export default {
  component: CssValueListItem,
  args: { hidden: false, labelColor: "default", focused: false },
  argTypes: {
    hidden: { control: "boolean" },
    focused: { control: "boolean" },
    labelColor: {
      options: labelColors,
      type: "inline-radio",
    },
  },
  title: "Library/CSS Value List Item",
};

const Thumbnail = styled("div", {
  width: theme.spacing[10],
  height: theme.spacing[10],
  backgroundImage: "linear-gradient(yellow, red)",
});

const Panel = styled("div", {
  width: theme.spacing[30],
});

const ListItem = (props: {
  hidden: boolean;
  labelColor: ComponentProps<typeof Label>["color"];
  state: undefined | "open";
  active: boolean;
  focused: undefined | boolean;
  label?: ReactNode;
  index: number;
}) => {
  const [pressed, onPressedChange] = useState(false);

  return (
    <CssValueListItem
      label={
        <Label disabled={props.hidden} color={props.labelColor} truncate>
          {props.label ?? "Image"}
        </Label>
      }
      thumbnail={<Thumbnail />}
      hidden={props.hidden}
      draggable
      state={props.state}
      focused={props.focused}
      active={props.active}
      index={props.index}
      id={String(props.index)}
      buttons={
        <>
          <SmallToggleButton
            pressed={pressed}
            onPressedChange={onPressedChange}
            variant="normal"
            tabIndex={-1}
            icon={pressed ? <EyeClosedIcon /> : <EyeOpenIcon />}
          />

          <SmallIconButton
            variant="destructive"
            tabIndex={-1}
            icon={<MinusIcon />}
          />
        </>
      }
      {...__testing__.listItemAttributes}
    />
  );
};

export const Declarative = (props: {
  hidden: boolean;
  focused: boolean;
  labelColor: "default";
}) => {
  const [pressed, onPressedChange] = useState(false);

  return (
    <Panel>
      <StorySection title="Configurable">
        <Popover>
          <PopoverTrigger asChild>
            <CssValueListItem
              id="0"
              index={0}
              label={
                <Label disabled={props.hidden} color={props.labelColor}>
                  Image
                </Label>
              }
              thumbnail={<Thumbnail />}
              hidden={props.hidden}
              focused={props.focused}
              buttons={
                <>
                  <SmallToggleButton
                    pressed={pressed}
                    onPressedChange={onPressedChange}
                    variant="normal"
                    tabIndex={-1}
                    icon={pressed ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  />

                  <SmallIconButton
                    variant="destructive"
                    tabIndex={-1}
                    icon={<MinusIcon />}
                  />
                </>
              }
            />
          </PopoverTrigger>
          <PopoverContent>
            <div className={css({ p: theme.spacing[10] })()}>Content</div>
          </PopoverContent>
        </Popover>
      </StorySection>

      <StorySection title="Overflows">
        <StoryGrid>
          <>
            {labelColors.map((labelColor, index) => (
              <ListItem
                key={labelColor}
                index={index}
                hidden={false}
                active={false}
                labelColor={labelColor}
                state={undefined}
                focused={false}
                label="Very long text, very long text"
              />
            ))}
          </>
        </StoryGrid>
      </StorySection>

      <StorySection title="Variants">
        <StoryGrid>
          <CssValueListArrowFocus>
            {labelColors.map((labelColor, index) => (
              <ListItem
                key={labelColor}
                index={index}
                hidden={false}
                active={false}
                labelColor={labelColor}
                state={undefined}
                focused={false}
              />
            ))}

            {labelColors.map((labelColor) => (
              <ListItem
                key={labelColor}
                index={-1}
                hidden={true}
                active={false}
                labelColor={labelColor}
                state={undefined}
                focused={false}
              />
            ))}

            {labelColors.map((labelColor, index) => (
              <ListItem
                key={labelColor}
                index={index}
                hidden={false}
                active={false}
                labelColor={labelColor}
                state={"open"}
                focused={false}
              />
            ))}
          </CssValueListArrowFocus>
        </StoryGrid>
      </StorySection>

      <StorySection title="Active">
        <StoryGrid>
          <CssValueListArrowFocus>
            {labelColors.map((labelColor, index) => (
              <ListItem
                key={labelColor}
                index={index}
                hidden={false}
                active={true}
                labelColor={labelColor}
                state={undefined}
                focused={false}
              />
            ))}

            {labelColors.map((labelColor, index) => (
              <ListItem
                key={labelColor}
                index={index}
                hidden={true}
                active={true}
                labelColor={labelColor}
                state={undefined}
                focused={false}
              />
            ))}

            {labelColors.map((labelColor, index) => (
              <ListItem
                key={labelColor}
                index={index}
                hidden={false}
                active={true}
                labelColor={labelColor}
                state={"open"}
                focused={false}
              />
            ))}
          </CssValueListArrowFocus>
        </StoryGrid>
      </StorySection>
    </Panel>
  );
};
Declarative.storyName = "CSS Value List Item";
