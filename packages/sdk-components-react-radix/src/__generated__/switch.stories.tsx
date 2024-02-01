import { useState } from "react";
import { Box as Box } from "@webstudio-is/sdk-components-react";
import { Switch as Switch, SwitchThumb as SwitchThumb } from "../components";

const Component = () => {
  let [switchChecked, set$switchChecked] = useState<any>(false);
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Switch
        data-ws-id="1"
        data-ws-component="Switch"
        checked={switchChecked}
        onCheckedChange={(checked: any) => {
          switchChecked = checked;
          set$switchChecked(switchChecked);
        }}
        className="c1oai8p0 cnd1wdj cuh3w30 c11hichb c95zj28 clo3r8o c1o2cngd c1riwd65 ci2hmcl c1byz2lk c17al2u0 c1ufcra4 c17gos5d cn4f13s c1cofqbt c85ds3m c1e8k408 c1uosf6b chxhflr cc4jebi c4zy9sv c18xqxv1 cpr3ke2 c1wmnqxw c1b503n2 co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr c1oa7gr0 ce92j53 c1939zof c14mirta"
      >
        <SwitchThumb
          data-ws-id="6"
          data-ws-component="SwitchThumb"
          className="c1qxqj1w c1say2x3 c1aacs57 c1u42gcv c1o2cngd c1riwd65 ci2hmcl c1byz2lk c110hgy6 c1ii9nza c89l9bb c1wmnqxw c1b503n2 c8w8p8q ck4sd1p"
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
  .c1oai8p0 {
    display: inline-flex
  }
  .cnd1wdj {
    height: 24px
  }
  .cuh3w30 {
    width: 44px
  }
  .c11hichb {
    flex-grow: 0
  }
  .c95zj28 {
    cursor: pointer
  }
  .clo3r8o {
    align-items: center
  }
  .c1o2cngd {
    border-top-left-radius: 9999px
  }
  .c1riwd65 {
    border-top-right-radius: 9999px
  }
  .ci2hmcl {
    border-bottom-right-radius: 9999px
  }
  .c1byz2lk {
    border-bottom-left-radius: 9999px
  }
  .c17al2u0 {
    border-top-style: solid
  }
  .c1ufcra4 {
    border-right-style: solid
  }
  .c17gos5d {
    border-bottom-style: solid
  }
  .cn4f13s {
    border-left-style: solid
  }
  .c1cofqbt {
    border-top-color: transparent
  }
  .c85ds3m {
    border-right-color: transparent
  }
  .c1e8k408 {
    border-bottom-color: transparent
  }
  .c1uosf6b {
    border-left-color: transparent
  }
  .chxhflr {
    border-top-width: 2px
  }
  .cc4jebi {
    border-right-width: 2px
  }
  .c4zy9sv {
    border-bottom-width: 2px
  }
  .c18xqxv1 {
    border-left-width: 2px
  }
  .cpr3ke2 {
    transition-property: all
  }
  .c1wmnqxw {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)
  }
  .c1b503n2 {
    transition-duration: 150ms
  }
  .co0lfwl:focus-visible {
    outline-width: 2px
  }
  .c1kn3u98:focus-visible {
    outline-style: solid
  }
  .c2odgnt:focus-visible {
    outline-color: transparent
  }
  .chlvjga:focus-visible {
    outline-offset: 2px
  }
  .c1jx7vpr:focus-visible {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  .c1oa7gr0:disabled {
    cursor: not-allowed
  }
  .ce92j53:disabled {
    opacity: 0.5
  }
  .c1939zof[data-state=checked] {
    background-color: rgba(15, 23, 42, 1)
  }
  .c14mirta[data-state=unchecked] {
    background-color: rgba(226, 232, 240, 1)
  }
  .c1qxqj1w {
    pointer-events: none
  }
  .c1say2x3 {
    display: block
  }
  .c1aacs57 {
    height: 1.25rem
  }
  .c1u42gcv {
    width: 1.25rem
  }
  .c110hgy6 {
    background-color: rgba(255, 255, 255, 0.8)
  }
  .c1ii9nza {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)
  }
  .c89l9bb {
    transition-property: transform
  }
  .c8w8p8q[data-state=checked] {
    transform: translateX(20px)
  }
  .ck4sd1p[data-state=unchecked] {
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
