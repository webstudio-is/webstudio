import {
  Box as Box,
  Button as Button,
  HtmlEmbed as HtmlEmbed,
  Text as Text,
} from "@webstudio-is/sdk-components-react/components";
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
    <Box className={`w-box`}>
      <Dialog>
        <DialogTrigger>
          <Button className={`w-button w-button-1`}>
            <HtmlEmbed
              code={
                '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M2.667 8h10.666M2.667 4h10.666M2.667 12h10.666"/></svg>'
              }
              className={`w-html-embed w-hamburger-menu-svg`}
            />
          </Button>
        </DialogTrigger>
        <DialogOverlay className={`w-dialog-overlay w-sheet-overlay`}>
          <DialogContent className={`w-dialog-content w-sheet-content`}>
            <Box data-ws-tag="nav" className={`w-box`}>
              <Box className={`w-box w-sheet-header`}>
                <DialogTitle className={`w-dialog-title w-sheet-title`}>
                  {"Sheet Title"}
                </DialogTitle>
                <DialogDescription
                  className={`w-dialog-description w-sheet-description`}
                >
                  {"Sheet description text you can edit"}
                </DialogDescription>
              </Box>
              <Text className={`w-text`}>{"The text you can edit"}</Text>
            </Box>
            <DialogClose className={`w-close-button w-close-button-1`}>
              <HtmlEmbed
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M12.5 3 3 12.5M3 3l9.5 9.5"/></svg>'
                }
                className={`w-html-embed w-close-icon`}
              />
            </DialogClose>
          </DialogContent>
        </DialogOverlay>
      </Dialog>
    </Box>
  );
};

export default {
  title: "Components/Sheet",
};

const Story = {
  render() {
    return (
      <>
        <style>
          {`
@layer presets {
  div.w-box {
    box-sizing: border-box
  }
  nav.w-box {
    box-sizing: border-box
  }
  button.w-button {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    text-transform: none;
    margin: 0
  }
  div.w-html-embed {
    display: contents;
    white-space: normal;
    white-space-collapse: collapse
  }
  div.w-text {
    box-sizing: border-box;
    min-height: 1em
  }
  button.w-close-button {
    background-color: transparent;
    background-image: none;
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    text-transform: none;
    border: 0px solid rgb(226 232 240 / 1);
    margin: 0;
    padding: 0px
  }
  div.w-dialog-content {
    box-sizing: border-box
  }
  p.w-dialog-description {
    box-sizing: border-box
  }
  div.w-dialog-overlay {
    box-sizing: border-box
  }
  h2.w-dialog-title {
    box-sizing: border-box
  }
}
@media all {
  .w-button-1 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    height: 2.5rem;
    width: 2.5rem;
    padding-top: 0px;
    padding-right: 0.375rem;
    padding-bottom: 0px;
    padding-left: 0.375rem;
    border: 0 solid rgb(226 232 240 / 1)
  }
  .w-button-1:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  .w-button-1:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184);
    outline: 2px solid transparent
  }
  .w-button-1:hover {
    background-color: rgb(241 245 249 / 1);
    color: rgb(15 23 42 / 1)
  }
  .w-hamburger-menu-svg {
    display: block;
    width: 100%;
    height: 100%;
    line-height: 0
  }
  .w-sheet-overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 50;
    background-color: rgb(255 255 255 / 0.8);
    -webkit-backdrop-filter: blur(0 1px 2px 0 rgb(0 0 0/0.05));
    backdrop-filter: blur(0 1px 2px 0 rgb(0 0 0/0.05));
    display: flex;
    flex-direction: column;
    overflow-x: auto;
    overflow-y: auto
  }
  .w-sheet-content {
    width: 100%;
    z-index: 50;
    display: flex;
    flex-direction: column;
    row-gap: 1rem;
    column-gap: 1rem;
    background-color: rgb(255 255 255 / 1);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    position: relative;
    margin-right: auto;
    max-width: 24rem;
    flex-grow: 1;
    border: 1px solid rgb(226 232 240 / 1);
    padding: 1.5rem
  }
  .w-sheet-header {
    display: flex;
    flex-direction: column;
    row-gap: 0.5rem;
    column-gap: 0.5rem
  }
  .w-sheet-title {
    font-size: 1.125rem;
    line-height: 1;
    letter-spacing: -0.025em;
    margin: 0
  }
  .w-sheet-description {
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: rgb(100 116 139 / 1);
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
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184)
  }
  .w-close-button-1:hover {
    opacity: 1
  }
  .w-close-icon {
    display: block;
    width: 100%;
    height: 100%;
    line-height: 0
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Sheet };
