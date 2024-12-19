import { Button } from "./button";
import { css, theme } from "../stitches.config";
import { textVariants } from "./text";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

export default {
  title: "Library/Floating Panel/Dialog",
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

const DialogDemo = () => (
  <Dialog defaultOpen>
    <DialogTrigger asChild>
      <Button>Open</Button>
    </DialogTrigger>
    <DialogContent>
      <div className={bodyStyle()}>
        <DialogDescription asChild>
          <p className={descriptionStyle()}>This is a description</p>
        </DialogDescription>
        <div className={buttonsStyle()}>
          <DialogClose>
            <Button color="ghost">Cancel</Button>
          </DialogClose>
          <DialogClose>
            <Button color="positive">Save</Button>
          </DialogClose>
        </div>
      </div>

      {/* Title is at the end intentionally,
       * to make the close button last in the tab order
       */}
      <DialogTitle>Title</DialogTitle>
    </DialogContent>
  </Dialog>
);
export { DialogDemo as Dialog };
