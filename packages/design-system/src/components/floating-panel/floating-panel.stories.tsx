import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./floating-panel-dialog";
import { CrossIcon } from "@webstudio-is/icons";

export default {
  title: "Library/Floating Panel",
};

export const FloatingPanel = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button className="Button violet" size="large">
        Edit profile
      </button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay className="DialogOverlay" />
      <DialogContent className="DialogContent">
        <DialogTitle className="DialogTitle">Edit profile</DialogTitle>
        <DialogDescription className="DialogDescription">
          Make changes to your profile here. Click save when you're done.
        </DialogDescription>
        <fieldset className="Fieldset">
          <label className="Label" htmlFor="name">
            Name
          </label>
          <input className="Input" id="name" defaultValue="Pedro Duarte" />
        </fieldset>
        <fieldset className="Fieldset">
          <label className="Label" htmlFor="username">
            Username
          </label>
          <input className="Input" id="username" defaultValue="@peduarte" />
        </fieldset>
        <div
          style={{ display: "flex", marginTop: 25, justifyContent: "flex-end" }}
        >
          <DialogClose asChild>
            <button className="Button green">Save changes</button>
          </DialogClose>
        </div>
        <DialogClose asChild>
          <button className="IconButton" aria-label="Close">
            <CrossIcon />
          </button>
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </Dialog>
);
