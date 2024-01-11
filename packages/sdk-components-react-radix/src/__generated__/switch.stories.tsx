import { useState } from "react";
import { Box as Box } from "@webstudio-is/sdk-components-react";
import { Switch as Switch, SwitchThumb as SwitchThumb } from "../components";

type Params = Record<string, string | undefined>;
type Resources = Record<string, unknown>;
const Page = (_props: { params: Params; resources: Resources }) => {
  let [switchChecked, set$switchChecked] = useState<any>(false);
  let onCheckedChange = (checked: any) => {
    switchChecked = checked;
    set$switchChecked(switchChecked);
  };
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Switch
        data-ws-id="1"
        data-ws-component="Switch"
        checked={switchChecked}
        onCheckedChange={onCheckedChange}
        className="c1mnuzt9 c1d1at8d c12hfef4 c1qmz361 c1c97wd6 c4v7k5r c17f8p6x c15ce0qo c1yisi8r cpvsov c1inucbi c1dab7w1 c1uf7v01 czynn8e cnwyako cthomhq c1rxblly c1chcr7b c1jdmvgd cro9q3k cunuc6r c1gtx6ev cu8n5i6 cqhjzs2 cxcp0y5 c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l cegrmbm c1grhw0w ccop5vc c10u8nhz"
      >
        <SwitchThumb
          data-ws-id="6"
          data-ws-component="SwitchThumb"
          className="c18myu9o c13oituv ckaw9ej c16fb3rt c17f8p6x c15ce0qo c1yisi8r cpvsov c15mffxy cbzcu1y c119ylpf cqhjzs2 cxcp0y5 c166bn31 cgmn562"
        />
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
html {margin: 0; display: grid; min-height: 100%}
@media all {
  body:where([data-ws-component="Body"]) {
    margin-top: 0;
    margin-right: 0;
    margin-bottom: 0;
    margin-left: 0;
    font-family: Arial, Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.2;
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale
  }
  div:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  address:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  article:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  aside:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  figure:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  footer:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  header:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  main:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  nav:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  section:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  button:where([data-ws-component="Switch"]) {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    margin-top: 0;
    margin-right: 0;
    margin-bottom: 0;
    margin-left: 0;
    box-sizing: border-box;
    border-top-width: 0px;
    border-right-width: 0px;
    border-bottom-width: 0px;
    border-left-width: 0px;
    text-transform: none;
    background-color: transparent;
    background-image: none;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    border-top-color: rgba(226, 232, 240, 1);
    border-right-color: rgba(226, 232, 240, 1);
    border-bottom-color: rgba(226, 232, 240, 1);
    border-left-color: rgba(226, 232, 240, 1);
    padding-left: 0px;
    padding-right: 0px;
    padding-top: 0px;
    padding-bottom: 0px
  }
  span:where([data-ws-component="SwitchThumb"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
}@media all {
  .c1mnuzt9 {
    display: inline-flex
  }
  .c1d1at8d {
    height: 24px
  }
  .c12hfef4 {
    width: 44px
  }
  .c1qmz361 {
    flex-grow: 0
  }
  .c1c97wd6 {
    cursor: pointer
  }
  .c4v7k5r {
    align-items: center
  }
  .c17f8p6x {
    border-top-left-radius: 9999px
  }
  .c15ce0qo {
    border-top-right-radius: 9999px
  }
  .c1yisi8r {
    border-bottom-right-radius: 9999px
  }
  .cpvsov {
    border-bottom-left-radius: 9999px
  }
  .c1inucbi {
    border-top-style: solid
  }
  .c1dab7w1 {
    border-right-style: solid
  }
  .c1uf7v01 {
    border-bottom-style: solid
  }
  .czynn8e {
    border-left-style: solid
  }
  .cnwyako {
    border-top-color: transparent
  }
  .cthomhq {
    border-right-color: transparent
  }
  .c1rxblly {
    border-bottom-color: transparent
  }
  .c1chcr7b {
    border-left-color: transparent
  }
  .c1jdmvgd {
    border-top-width: 2px
  }
  .cro9q3k {
    border-right-width: 2px
  }
  .cunuc6r {
    border-bottom-width: 2px
  }
  .c1gtx6ev {
    border-left-width: 2px
  }
  .cu8n5i6 {
    transition-property: all
  }
  .cqhjzs2 {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)
  }
  .cxcp0y5 {
    transition-duration: 150ms
  }
  .c1t6bql4:focus-visible {
    outline-width: 2px
  }
  .czph7hf:focus-visible {
    outline-style: solid
  }
  .cncn1ro:focus-visible {
    outline-color: transparent
  }
  .cb270vo:focus-visible {
    outline-offset: 2px
  }
  .c1rgsd1l:focus-visible {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  .cegrmbm:disabled {
    cursor: not-allowed
  }
  .c1grhw0w:disabled {
    opacity: 0.5
  }
  .ccop5vc[data-state=checked] {
    background-color: rgba(15, 23, 42, 1)
  }
  .c10u8nhz[data-state=unchecked] {
    background-color: rgba(226, 232, 240, 1)
  }
  .c18myu9o {
    pointer-events: none
  }
  .c13oituv {
    display: block
  }
  .ckaw9ej {
    height: 1.25rem
  }
  .c16fb3rt {
    width: 1.25rem
  }
  .c17f8p6x {
    border-top-left-radius: 9999px
  }
  .c15ce0qo {
    border-top-right-radius: 9999px
  }
  .c1yisi8r {
    border-bottom-right-radius: 9999px
  }
  .cpvsov {
    border-bottom-left-radius: 9999px
  }
  .c15mffxy {
    background-color: rgba(255, 255, 255, 0.8)
  }
  .cbzcu1y {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)
  }
  .c119ylpf {
    transition-property: transform
  }
  .cqhjzs2 {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)
  }
  .cxcp0y5 {
    transition-duration: 150ms
  }
  .c166bn31[data-state=checked] {
    transform: translateX(20px)
  }
  .cgmn562[data-state=unchecked] {
    transform: translateX(0px)
  }
}
      `}
        </style>
        <Page params={{}} resources={{}} />
      </>
    );
  },
};

export { Story as Switch };
