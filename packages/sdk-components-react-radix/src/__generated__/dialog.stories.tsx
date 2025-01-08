import {
  Box as Box,
  Button as Button,
  Text as Text,
  HtmlEmbed as HtmlEmbed,
} from "@webstudio-is/sdk-components-react";
import {
  Dialog as Dialog,
  DialogTrigger as DialogTrigger,
  DialogOverlay as DialogOverlay,
  DialogContent as DialogContent,
  DialogTitle as DialogTitle,
  DialogDescription as DialogDescription,
  DialogClose as DialogClose,
} from "../components";

const Component = () => {
  return (
    <Box className={"w-box"}>
      <Dialog>
        <DialogTrigger>
          <Button className={"w-button w-button-1"}>{"Button"}</Button>
        </DialogTrigger>
        <DialogOverlay className={"w-dialog-overlay w-dialog-overlay-1"}>
          <DialogContent className={"w-dialog-content w-dialog-content-1"}>
            <Box className={"w-box w-dialog-header"}>
              <DialogTitle className={"w-dialog-title w-dialog-title-1"}>
                {"Dialog Title you can edit"}
              </DialogTitle>
              <DialogDescription
                className={"w-dialog-description w-dialog-description-1"}
              >
                {"Dialog description text you can edit"}
              </DialogDescription>
            </Box>
            <Text className={"w-text"}>{"The text you can edit"}</Text>
            <DialogClose className={"w-close-button w-close-button-1"}>
              <HtmlEmbed
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M12.5 3 3 12.5M3 3l9.5 9.5"/></svg>'
                }
                className={"w-html-embed"}
              />
            </DialogClose>
          </DialogContent>
        </DialogOverlay>
      </Dialog>
    </Box>
  );
};

export default {
  title: "Components/Dialog",
};

const Story = {
  render() {
    return (
      <>
        <style>
          {`
@media all {
  :where(div.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(address.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(article.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(aside.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(figure.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(footer.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(header.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(main.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(nav.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(section.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(button.w-button) {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    text-transform: none;
    margin: 0
  }
  :where(div.w-html-embed) {
    display: contents;
    white-space: normal;
    white-space-collapse: collapse
  }
  :where(div.w-text) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    min-height: 1em
  }
  :where(button.w-close-button) {
    background-color: transparent;
    background-image: none;
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    text-transform: none;
    border: 1px solid rgba(226, 232, 240, 1);
    margin: 0;
    padding: 0px
  }
  :where(div.w-dialog-content) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(p.w-dialog-description) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-dialog-overlay) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(h2.w-dialog-title) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
}
@media all {
  .w-button-1 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 1);
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    height: 2.5rem;
    padding-top: 0.5rem;
    padding-right: 1rem;
    padding-bottom: 0.5rem;
    padding-left: 1rem;
    border: 1px solid rgba(226, 232, 240, 1)
  }
  .w-button-1:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  .w-button-1:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 calc(2px + 2px) rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  .w-button-1:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-dialog-overlay-1 {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 50;
    background-color: rgba(255, 255, 255, 0.8);
    -webkit-backdrop-filter: blur(0 1px 2px 0 rgb(0 0 0/0.05));
    backdrop-filter: blur(0 1px 2px 0 rgb(0 0 0/0.05));
    display: flex;
    overflow-x: auto;
    overflow-y: auto
  }
  .w-dialog-content-1 {
    width: 100%;
    z-index: 50;
    display: flex;
    flex-direction: column;
    row-gap: 1rem;
    column-gap: 1rem;
    max-width: 32rem;
    background-color: rgba(255, 255, 255, 1);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    position: relative;
    border: 1px solid rgba(226, 232, 240, 1);
    margin: auto;
    padding: 1.5rem
  }
  .w-dialog-header {
    display: flex;
    flex-direction: column;
    row-gap: 0.5rem;
    column-gap: 0.5rem
  }
  .w-dialog-title-1 {
    font-size: 1.125rem;
    line-height: 1;
    letter-spacing: -0.025em;
    margin: 0
  }
  .w-dialog-description-1 {
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: rgba(100, 116, 139, 1);
    margin: 0
  }
  .w-close-button-1 {
    position: absolute;
    right: 1rem;
    top: 1rem;
    border-top-left-radius: 0.125rem;
    border-top-right-radius: 0.125rem;
    border-bottom-right-radius: 0.125rem;
    border-bottom-left-radius: 0.125rem;
    opacity: 0.7;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1rem;
    width: 1rem;
    background-color: transparent;
    outline: medium none currentcolor;
    border: 0 none currentcolor
  }
  .w-close-button-1:focus-visible {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 calc(2px + 2px) rgba(148, 163, 184, 1)
  }
  .w-close-button-1:hover {
    opacity: 1
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Dialog };
