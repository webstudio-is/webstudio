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

export default {
  component: CssValueListItem,
  args: { hidden: false, labelColor: "default" },
  argTypes: {
    hidden: { control: "boolean" },
    labelColor: {
      options: ["default", "preset", "local", "remote"],
      type: "inline-radio",
    },
  },
};

const Thumbnail = styled("div", {
  width: theme.spacing[10],
  height: theme.spacing[10],
  backgroundImage: "linear-gradient(yellow, red)",
});

export const Declarative = (props: {
  hidden: boolean;
  labelColor: "default";
}) => {
  const [pressed, onPressedChange] = React.useState(false);

  return (
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
  );
};
