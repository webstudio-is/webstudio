import { css, styled, theme } from "../stitches.config";
import { CssValueListItem } from "./css-value-list-item";
import { Label } from "./label";
import { SmallToggleButton } from "./small-toggle-button";
import {
  EyeconOpenIcon,
  EyeconClosedIcon,
  SubtractIcon,
} from "@webstudio-is/icons";
import * as React from "react";
import { SmallIconButton } from "./small-icon-button";
import {
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTrigger,
} from "./floating-panel-popover";
import { StorySection, StoryGrid } from "./storybook";

export default {
  component: CssValueListItem,
  args: { hidden: false, labelColor: "default", focused: false },
  argTypes: {
    hidden: { control: "boolean" },
    focused: { control: "boolean" },
    labelColor: {
      options: ["default", "preset", "local", "remote"],
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
  labelColor: "default" | "preset" | "local" | "remote";
  state: undefined | "open";
  active: boolean;
  focused: undefined | boolean;
  label?: React.ReactNode;
}) => {
  const [pressed, onPressedChange] = React.useState(false);

  return (
    <CssValueListItem
      label={
        <Label disabled={props.hidden} color={props.labelColor} truncate>
          {props.label ?? "Image"}
        </Label>
      }
      thumbnail={<Thumbnail />}
      hidden={props.hidden}
      state={props.state}
      focused={props.focused}
      active={props.active}
      buttons={
        <>
          <SmallToggleButton
            pressed={pressed}
            onPressedChange={onPressedChange}
            variant="normal"
            tabIndex={0}
            icon={pressed ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
          />

          <SmallIconButton
            variant="destructive"
            tabIndex={0}
            icon={<SubtractIcon />}
          />
        </>
      }
    />
  );
};

export const Declarative = (props: {
  hidden: boolean;
  focused: boolean;
  labelColor: "default";
}) => {
  const [pressed, onPressedChange] = React.useState(false);

  return (
    <Panel>
      <StorySection title="Configurable">
        <FloatingPanelPopover>
          <FloatingPanelPopoverTrigger asChild>
            <CssValueListItem
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
                    tabIndex={0}
                    icon={pressed ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
                  />

                  <SmallIconButton
                    variant="destructive"
                    tabIndex={0}
                    icon={<SubtractIcon />}
                  />
                </>
              }
            />
          </FloatingPanelPopoverTrigger>
          <FloatingPanelPopoverContent>
            <div className={css({ p: theme.spacing[10] })()}>Content</div>
          </FloatingPanelPopoverContent>
        </FloatingPanelPopover>
      </StorySection>

      <StorySection title="Overflows">
        <StoryGrid>
          {(["default", "preset", "local", "remote"] as const).map(
            (labelColor) => (
              <ListItem
                key={labelColor}
                hidden={false}
                active={false}
                labelColor={labelColor}
                state={undefined}
                focused={false}
                label="Very long text, very long text"
              />
            )
          )}
        </StoryGrid>
      </StorySection>

      <StorySection title="Variants">
        <StoryGrid>
          {(["default", "preset", "local", "remote"] as const).map(
            (labelColor) => (
              <ListItem
                key={labelColor}
                hidden={false}
                active={false}
                labelColor={labelColor}
                state={undefined}
                focused={false}
              />
            )
          )}

          {(["default", "preset", "local", "remote"] as const).map(
            (labelColor) => (
              <ListItem
                key={labelColor}
                hidden={true}
                active={false}
                labelColor={labelColor}
                state={undefined}
                focused={false}
              />
            )
          )}

          {(["default", "preset", "local", "remote"] as const).map(
            (labelColor) => (
              <ListItem
                key={labelColor}
                hidden={false}
                active={false}
                labelColor={labelColor}
                state={"open"}
                focused={false}
              />
            )
          )}
        </StoryGrid>
      </StorySection>

      <StorySection title="Active">
        <StoryGrid>
          {(["default", "preset", "local", "remote"] as const).map(
            (labelColor) => (
              <ListItem
                key={labelColor}
                hidden={false}
                active={true}
                labelColor={labelColor}
                state={undefined}
                focused={false}
              />
            )
          )}

          {(["default", "preset", "local", "remote"] as const).map(
            (labelColor) => (
              <ListItem
                key={labelColor}
                hidden={true}
                active={true}
                labelColor={labelColor}
                state={undefined}
                focused={false}
              />
            )
          )}

          {(["default", "preset", "local", "remote"] as const).map(
            (labelColor) => (
              <ListItem
                key={labelColor}
                hidden={false}
                active={true}
                labelColor={labelColor}
                state={"open"}
                focused={false}
              />
            )
          )}
        </StoryGrid>
      </StorySection>
    </Panel>
  );
};
Declarative.storyName = "CSS Value List Item";
