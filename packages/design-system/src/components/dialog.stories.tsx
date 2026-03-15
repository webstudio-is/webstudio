import { Button } from "./button";
import { css, theme } from "../stitches.config";
import { textVariants } from "./text";
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogMaximize,
  DialogTitle,
  DialogTitleActions,
  DialogTrigger,
} from "./dialog";

export default {
  title: "Floating panel/Dialog",
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

export const ResizableDialog = () => (
  <Dialog defaultOpen resize="both">
    <DialogTrigger asChild>
      <Button>Open resizable</Button>
    </DialogTrigger>
    <DialogContent>
      <div className={bodyStyle()}>
        <DialogDescription asChild>
          <p className={descriptionStyle()}>
            Resize this dialog by dragging the edges
          </p>
        </DialogDescription>
      </div>
      <DialogTitle>Resizable</DialogTitle>
    </DialogContent>
  </Dialog>
);

export const WithMaximize = () => (
  <Dialog defaultOpen resize="both">
    <DialogTrigger asChild>
      <Button>Open maximizable</Button>
    </DialogTrigger>
    <DialogContent>
      <div className={bodyStyle()}>
        <DialogDescription asChild>
          <p className={descriptionStyle()}>
            Click the maximize button to expand
          </p>
        </DialogDescription>
      </div>
      <DialogTitle
        suffix={
          <DialogTitleActions>
            <DialogMaximize />
            <DialogClose />
          </DialogTitleActions>
        }
      >
        Maximizable
      </DialogTitle>
    </DialogContent>
  </Dialog>
);

export const WithActions = () => (
  <Dialog defaultOpen>
    <DialogTrigger asChild>
      <Button>Open with actions</Button>
    </DialogTrigger>
    <DialogContent>
      <div className={bodyStyle()}>
        <DialogDescription asChild>
          <p className={descriptionStyle()}>
            Dialog with action buttons at the bottom
          </p>
        </DialogDescription>
      </div>
      <DialogActions>
        <DialogClose>
          <Button color="positive">Save</Button>
        </DialogClose>
        <DialogClose>
          <Button color="ghost">Cancel</Button>
        </DialogClose>
      </DialogActions>
      <DialogTitle>With actions</DialogTitle>
    </DialogContent>
  </Dialog>
);

export const NonDraggable = () => (
  <Dialog defaultOpen draggable={false}>
    <DialogTrigger asChild>
      <Button>Open non-draggable</Button>
    </DialogTrigger>
    <DialogContent>
      <div className={bodyStyle()}>
        <DialogDescription asChild>
          <p className={descriptionStyle()}>This dialog cannot be dragged</p>
        </DialogDescription>
      </div>
      <DialogTitle>Non-draggable</DialogTitle>
    </DialogContent>
  </Dialog>
);
