import { Button } from "../button";
import { css, theme } from "../../stitches.config";
import { typography } from "../typography";
import * as Popover from "./popover";

export default {
  title: "Library/Floating Panel/Popover",
};

const bodyStyles = css({
  padding: theme.spacing[9],
});

const descriptionStyles = css(typography.regular, {
  marginTop: 0,
  marginBottom: theme.spacing[9],
});

const buttonsStyle = css({
  display: "flex",
  gap: theme.spacing[5],
  justifyContent: "flex-end",
});

const PopoverDemo = () => (
  <Popover.Root defaultOpen>
    <Popover.Trigger asChild>
      <Button>Open</Button>
    </Popover.Trigger>
    <Popover.Content>
      <div className={bodyStyles()}>
        <p className={descriptionStyles()}>This is a description</p>
        <div className={buttonsStyle()}>
          <Popover.Close asChild>
            <Button color="ghost">Cancel</Button>
          </Popover.Close>
          <Popover.Close asChild>
            <Button color="positive">Save</Button>
          </Popover.Close>
        </div>
      </div>

      {/* Title is at the end intentionally,
       * to make the close button last in the tab order
       */}
      <Popover.Title>Title</Popover.Title>
    </Popover.Content>
  </Popover.Root>
);
export { PopoverDemo as Popover };
