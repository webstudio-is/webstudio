import { useVariableState } from "@webstudio-is/react-sdk/runtime";
import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
  Text as Text,
} from "@webstudio-is/sdk-components-react";
import {
  Label as Label,
  Checkbox as Checkbox,
  CheckboxIndicator as CheckboxIndicator,
} from "../components";

const Component = () => {
  let [checkboxChecked, set$checkboxChecked] = useVariableState<any>(false);
  return (
    <Box className={"w-box"}>
      <Label className={"w-label w-checkbox-field"}>
        <Checkbox
          checked={checkboxChecked}
          onCheckedChange={(checked: any) => {
            checkboxChecked = checked;
            set$checkboxChecked(checkboxChecked);
          }}
          className={"w-checkbox w-checkbox-1"}
        >
          <CheckboxIndicator
            className={"w-checkbox-indicator w-checkbox-indicator-1"}
          >
            <HtmlEmbed
              code={
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
              }
              className={"w-html-embed"}
            />
          </CheckboxIndicator>
        </Checkbox>
        <Text tag={"span"} className={"w-text"}>
          {"Checkbox"}
        </Text>
      </Label>
    </Box>
  );
};

export default {
  title: "Components/Checkbox",
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
  :where(label.w-label) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(button.w-checkbox) {
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
  :where(span.w-checkbox-indicator) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-html-embed) {
    display: contents
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
}
@media all {
  .w-checkbox-field {
    display: flex;
    row-gap: 0.5rem;
    column-gap: 0.5rem;
    align-items: center
  }
  .w-checkbox-1 {
    height: 1rem;
    width: 1rem;
    flex-grow: 0;
    border-top-left-radius: 0.125rem;
    border-top-right-radius: 0.125rem;
    border-bottom-right-radius: 0.125rem;
    border-bottom-left-radius: 0.125rem;
    border: 1px solid rgba(15, 23, 42, 1)
  }
  .w-checkbox-1:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-checkbox-1:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  .w-checkbox-1[data-state=checked] {
    background-color: rgba(15, 23, 42, 1);
    color: rgba(248, 250, 252, 1)
  }
  .w-checkbox-indicator-1 {
    display: flex;
    align-items: center;
    justify-content: center;
    color: currentColor
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Checkbox };
