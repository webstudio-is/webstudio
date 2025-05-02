import { Box as Box } from "@webstudio-is/sdk-components-react";
import { Switch as Switch, SwitchThumb as SwitchThumb } from "../components";

const Component = () => {
  return (
    <Box className={"w-box"}>
      <Switch className={"w-switch w-switch-1"}>
        <SwitchThumb className={"w-switch-thumb w-switch-thumb-1"} />
      </Switch>
    </Box>
  );
};

export default {
  title: "Components/Switch",
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
  :where(button.w-switch) {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    text-transform: none;
    background-color: transparent;
    background-image: none;
    border: 0px solid rgba(226, 232, 240, 1);
    margin: 0;
    padding: 0px
  }
  :where(span.w-switch-thumb) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
}
@media all {
  .w-switch-1 {
    display: inline-flex;
    height: 24px;
    width: 44px;
    flex-shrink: 0;
    cursor: pointer;
    align-items: center;
    border-top-left-radius: 9999px;
    border-top-right-radius: 9999px;
    border-bottom-right-radius: 9999px;
    border-bottom-left-radius: 9999px;
    transition-property: all;
    transition-duration: 150ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: 0s;
    transition-behavior: normal;
    border: 2px solid transparent
  }
  .w-switch-1:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-switch-1:focus-visible {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 calc(2px + 2px) rgba(148, 163, 184, 1);
    outline: medium none currentcolor
  }
  .w-switch-1[data-state="checked"] {
    background-color: rgba(15, 23, 42, 1)
  }
  .w-switch-1[data-state="unchecked"] {
    background-color: rgba(226, 232, 240, 1)
  }
  .w-switch-thumb-1 {
    pointer-events: none;
    display: block;
    height: 1.25rem;
    width: 1.25rem;
    border-top-left-radius: 9999px;
    border-top-right-radius: 9999px;
    border-bottom-right-radius: 9999px;
    border-bottom-left-radius: 9999px;
    background-color: rgba(255, 255, 255, 1);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    transition-property: transform;
    transition-duration: 150ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: 0s;
    transition-behavior: normal
  }
  .w-switch-thumb-1[data-state="checked"] {
    transform: translateX(20px)
  }
  .w-switch-thumb-1[data-state="unchecked"] {
    transform: translateX(0px)
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Switch };
