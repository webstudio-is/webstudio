import { useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Box as Box } from "@webstudio-is/sdk-components-react";
import { Switch as Switch, SwitchThumb as SwitchThumb } from "../components";

const Component = () => {
  let [switchChecked, set$switchChecked] = useVariableState<any>(false);
  return (
    <Box className={"w-box"}>
      <Switch
        checked={switchChecked}
        onCheckedChange={(checked: any) => {
          switchChecked = checked;
          set$switchChecked(switchChecked);
        }}
        className={"w-switch w-switch-1"}
      >
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
  :where(body.w-body) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 0
  }
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
    flex-grow: 0;
    cursor: pointer;
    align-items: center;
    border-top-left-radius: 9999px;
    border-top-right-radius: 9999px;
    border-bottom-right-radius: 9999px;
    border-bottom-left-radius: 9999px;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
    border: 2px solid transparent
  }
  .w-switch-1:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-switch-1:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  .w-switch-1[data-state=checked] {
    background-color: rgba(15, 23, 42, 1)
  }
  .w-switch-1[data-state=unchecked] {
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
    background-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms
  }
  .w-switch-thumb-1[data-state=checked] {
    transform: translateX(20px)
  }
  .w-switch-thumb-1[data-state=unchecked] {
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
