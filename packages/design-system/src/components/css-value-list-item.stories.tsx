import { useState, type ComponentProps, type ReactNode } from "react";
import { styled, theme } from "../stitches.config";
import {
  CssValueListArrowFocus,
  CssValueListItem,
  __testing__,
} from "./css-value-list-item";
import { Label, labelColors } from "./label";
import { SmallToggleButton } from "./small-toggle-button";
import { EyeOpenIcon, EyeClosedIcon, MinusIcon } from "@webstudio-is/icons";
import { SmallIconButton } from "./small-icon-button";
import { StorySection, StoryGrid } from "./storybook";

export default {
  component: CssValueListItem,
  title: "CSS Value List Item",
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

export const CSSValueListItem = () => {
  return (
    <Panel>
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

      <StorySection title="No thumbnail">
        <CssValueListArrowFocus>
          <CssValueListItem
            id="no-thumb-0"
            index={0}
            label={<Label>Text only item</Label>}
            hidden={false}
            buttons={
              <SmallIconButton
                variant="destructive"
                tabIndex={-1}
                icon={<MinusIcon />}
              />
            }
            {...__testing__.listItemAttributes}
          />
          <CssValueListItem
            id="no-thumb-1"
            index={1}
            label={<Label>Another text item</Label>}
            hidden={false}
            buttons={
              <SmallIconButton
                variant="destructive"
                tabIndex={-1}
                icon={<MinusIcon />}
              />
            }
            {...__testing__.listItemAttributes}
          />
        </CssValueListArrowFocus>
      </StorySection>

      <StorySection title="Disabled state">
        <CssValueListArrowFocus>
          <CssValueListItem
            id="disabled-0"
            index={0}
            label={<Label>Disabled item</Label>}
            thumbnail={<Thumbnail />}
            hidden={false}
            disabled
            {...__testing__.listItemAttributes}
          />
          <CssValueListItem
            id="disabled-1"
            index={1}
            label={<Label>Enabled item</Label>}
            thumbnail={<Thumbnail />}
            hidden={false}
            {...__testing__.listItemAttributes}
          />
        </CssValueListArrowFocus>
      </StorySection>

      <StorySection title="Arrow focus with drag item">
        <CssValueListArrowFocus dragItemId="drag-1">
          {labelColors.map((labelColor, index) => (
            <ListItem
              key={labelColor}
              index={index}
              hidden={false}
              active={index === 1}
              labelColor={labelColor}
              state={undefined}
              focused={false}
            />
          ))}
        </CssValueListArrowFocus>
      </StorySection>
    </Panel>
  );
};
