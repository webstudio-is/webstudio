import { Button } from "./button";
import { css, theme } from "../stitches.config";
import { textVariants } from "./text";
import {
  FloatingPanelPopover,
  FloatingPanelPopoverClose,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  FloatingPanelPopoverTrigger,
} from "./floating-panel-popover";

export default {
  title: "Library/Floating Panel/Popover",
};

const bodyStyle = css({
  padding: theme.spacing[9],
});

const descriptionStyle = css(textVariants.regular, {
  marginTop: 0,
  marginBottom: theme.spacing[9],
});

const buttonsStyle = css({
  display: "flex",
  gap: theme.spacing[5],
  justifyContent: "flex-end",
});

const PopoverDemo = () => (
  <FloatingPanelPopover defaultOpen>
    <FloatingPanelPopoverTrigger asChild>
      <Button>Open</Button>
    </FloatingPanelPopoverTrigger>
    <FloatingPanelPopoverContent>
      <div className={bodyStyle()}>
        <p className={descriptionStyle()}>This is a description</p>
        <div className={buttonsStyle()}>
          <FloatingPanelPopoverClose asChild>
            <Button color="ghost">Cancel</Button>
          </FloatingPanelPopoverClose>
          <FloatingPanelPopoverClose asChild>
            <Button color="positive">Save</Button>
          </FloatingPanelPopoverClose>
        </div>
      </div>

      {/* Title is at the end intentionally,
       * to make the close button last in the tab order
       */}
      <FloatingPanelPopoverTitle>Title</FloatingPanelPopoverTitle>
    </FloatingPanelPopoverContent>
  </FloatingPanelPopover>
);
export { PopoverDemo as Popover };
