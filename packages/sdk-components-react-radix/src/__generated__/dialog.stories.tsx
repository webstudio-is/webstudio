import { useState } from "react";
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

type Params = Record<string, string | undefined>;
const Page = (_props: { params: Params }) => {
  let [dialogOpen, set$dialogOpen] = useState<any>(false);
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Dialog
        data-ws-id="1"
        data-ws-component="Dialog"
        open={dialogOpen}
        onOpenChange={(open: any) => {
          dialogOpen = open;
          set$dialogOpen(dialogOpen);
        }}
      >
        <DialogTrigger data-ws-id="5" data-ws-component="DialogTrigger">
          <Button
            data-ws-id="6"
            data-ws-component="Button"
            className="c17al2u0 c1ufcra4 c17gos5d cn4f13s c1wic2il cdem58j c102tttv cb204z1 ck2qarh c1nxbatd caktpzb c1bm526f c110hgy6 c1oai8p0 clo3r8o cw9oyzl cuqxbts cg19ih8 c1479lj6 comq4ym c1qx3pju cut8gip c1qjvju3 c18kkil c1c2uk29 c1x1m3cj cey1d5i cbnv1sn co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr c1jirpm3 ce92j53 c1dr421o c14ytp9r"
          >
            {"Button"}
          </Button>
        </DialogTrigger>
        <DialogOverlay
          data-ws-id="8"
          data-ws-component="DialogOverlay"
          className="c15h1j27 cboqcgi cs5y8q6 ccq2s6t c3iotp8 c173yyao c110hgy6 c1x0vq2l c11xgi9i c1arpcws"
        >
          <DialogContent
            data-ws-id="10"
            data-ws-component="DialogContent"
            className="c3elmho c173yyao c11xgi9i cfd715b ci4ea85 c13l7myj cakk94o cmty91p cukjqkn c12w8ig6 cqfb83m c17al2u0 c1ufcra4 c17gos5d cn4f13s c1wic2il cdem58j c102tttv cb204z1 ck2qarh c1nxbatd caktpzb c1bm526f c110hgy6 c1d23hgf cdv5i03 cog45sw c18egw0s c1ii9nza crmoyyg"
          >
            <Box
              data-ws-id="12"
              data-ws-component="Box"
              className="c11xgi9i cfd715b csjyi15 c1xv9rff"
            >
              <DialogTitle
                data-ws-id="14"
                data-ws-component="DialogTitle"
                className="cvrokas crk8tjo cx5cc56 c1o7k99s cck9swn"
              >
                {"Dialog Title"}
              </DialogTitle>
              <DialogDescription
                data-ws-id="16"
                data-ws-component="DialogDescription"
                className="cvrokas crk8tjo c1qx3pju cut8gip c1pcz91e"
              >
                {"Dialog description text you can edit"}
              </DialogDescription>
            </Box>
            <Text data-ws-id="18" data-ws-component="Text">
              {"The text you can edit"}
            </Text>
            <DialogClose
              data-ws-id="19"
              data-ws-component="DialogClose"
              className="ct2k8wg c1us255 c1hk37yi c12e8ong c13c161l chzvexg c1s51a6q c1qx8273 c11xgi9i clo3r8o cw9oyzl c1pmpq0f c1yafs04 c17al2u0 c1ufcra4 c17gos5d cn4f13s c1wic2il cdem58j c102tttv cb204z1 cok6gp c1ebb32d c1ed2n1f c1an30v3 ca60kt0 cxlxl0c c1gfzcg5 cohan28 c15roejc c1xy5yrr c192vyv4"
            >
              <HtmlEmbed
                data-ws-id="21"
                data-ws-component="HtmlEmbed"
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M13.566 2.434a.8.8 0 0 1 0 1.132L9.13 8l4.435 4.434a.8.8 0 0 1-1.132 1.132L8 9.13l-4.434 4.435a.8.8 0 0 1-1.132-1.132L6.87 8 2.434 3.566a.8.8 0 0 1 1.132-1.132L8 6.87l4.434-4.435a.8.8 0 0 1 1.132 0Z" clip-rule="evenodd"/></svg>'
                }
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
  button:where([data-ws-component="Button"]) {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    margin-top: 0;
    margin-right: 0;
    margin-bottom: 0;
    margin-left: 0;
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    text-transform: none
  }
  div:where([data-ws-component="DialogOverlay"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="DialogContent"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  h2:where([data-ws-component="DialogTitle"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  p:where([data-ws-component="DialogDescription"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="Text"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    min-height: 1em
  }
  button:where([data-ws-component="DialogClose"]) {
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
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    padding-left: 0px;
    padding-right: 0px;
    padding-top: 0px;
    padding-bottom: 0px;
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    margin-top: 0;
    margin-right: 0;
    margin-bottom: 0;
    margin-left: 0;
    box-sizing: border-box;
    text-transform: none
  }
}@media all {
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
  .c1wic2il {
    border-top-color: rgba(226, 232, 240, 1)
  }
  .cdem58j {
    border-right-color: rgba(226, 232, 240, 1)
  }
  .c102tttv {
    border-bottom-color: rgba(226, 232, 240, 1)
  }
  .cb204z1 {
    border-left-color: rgba(226, 232, 240, 1)
  }
  .ck2qarh {
    border-top-width: 1px
  }
  .c1nxbatd {
    border-right-width: 1px
  }
  .caktpzb {
    border-bottom-width: 1px
  }
  .c1bm526f {
    border-left-width: 1px
  }
  .c110hgy6 {
    background-color: rgba(255, 255, 255, 0.8)
  }
  .c1oai8p0 {
    display: inline-flex
  }
  .clo3r8o {
    align-items: center
  }
  .cw9oyzl {
    justify-content: center
  }
  .cuqxbts {
    border-top-left-radius: 0.375rem
  }
  .cg19ih8 {
    border-top-right-radius: 0.375rem
  }
  .c1479lj6 {
    border-bottom-right-radius: 0.375rem
  }
  .comq4ym {
    border-bottom-left-radius: 0.375rem
  }
  .c1qx3pju {
    font-size: 0.875rem
  }
  .cut8gip {
    line-height: 1.25rem
  }
  .c1qjvju3 {
    font-weight: 500
  }
  .c18kkil {
    height: 2.5rem
  }
  .c1c2uk29 {
    padding-left: 1rem
  }
  .c1x1m3cj {
    padding-right: 1rem
  }
  .cey1d5i {
    padding-top: 0.5rem
  }
  .cbnv1sn {
    padding-bottom: 0.5rem
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
  .c1jirpm3:disabled {
    pointer-events: none
  }
  .ce92j53:disabled {
    opacity: 0.5
  }
  .c1dr421o:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c14ytp9r:hover {
    color: rgba(15, 23, 42, 1)
  }
  .c15h1j27 {
    position: fixed
  }
  .cboqcgi {
    left: 0px
  }
  .cs5y8q6 {
    right: 0px
  }
  .ccq2s6t {
    top: 0px
  }
  .c3iotp8 {
    bottom: 0px
  }
  .c173yyao {
    z-index: 50
  }
  .c1x0vq2l {
    backdrop-filter: blur(0 1px 2px 0 rgb(0 0 0 / 0.05))
  }
  .c11xgi9i {
    display: flex
  }
  .c1arpcws {
    overflow: auto
  }
  .c3elmho {
    width: 100%
  }
  .cfd715b {
    flex-direction: column
  }
  .ci4ea85 {
    row-gap: 1rem
  }
  .c13l7myj {
    column-gap: 1rem
  }
  .cakk94o {
    margin-left: auto
  }
  .cmty91p {
    margin-right: auto
  }
  .cukjqkn {
    margin-top: auto
  }
  .c12w8ig6 {
    margin-bottom: auto
  }
  .cqfb83m {
    max-width: 32rem
  }
  .c1d23hgf {
    padding-left: 1.5rem
  }
  .cdv5i03 {
    padding-right: 1.5rem
  }
  .cog45sw {
    padding-top: 1.5rem
  }
  .c18egw0s {
    padding-bottom: 1.5rem
  }
  .c1ii9nza {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)
  }
  .crmoyyg {
    position: relative
  }
  .csjyi15 {
    row-gap: 0.25rem
  }
  .c1xv9rff {
    column-gap: 0.25rem
  }
  .cvrokas {
    margin-top: 0px
  }
  .crk8tjo {
    margin-bottom: 0px
  }
  .cx5cc56 {
    line-height: 1.75rem
  }
  .c1o7k99s {
    font-size: 1.125rem
  }
  .cck9swn {
    letter-spacing: -0.025em
  }
  .c1pcz91e {
    color: rgba(100, 116, 139, 1)
  }
  .ct2k8wg {
    position: absolute
  }
  .c1us255 {
    right: 1rem
  }
  .c1hk37yi {
    top: 1rem
  }
  .c12e8ong {
    border-top-left-radius: 0.125rem
  }
  .c13c161l {
    border-top-right-radius: 0.125rem
  }
  .chzvexg {
    border-bottom-right-radius: 0.125rem
  }
  .c1s51a6q {
    border-bottom-left-radius: 0.125rem
  }
  .c1qx8273 {
    opacity: 0.7
  }
  .c1pmpq0f {
    height: 1rem
  }
  .c1yafs04 {
    width: 1rem
  }
  .cok6gp {
    border-top-width: 0px
  }
  .c1ebb32d {
    border-right-width: 0px
  }
  .c1ed2n1f {
    border-bottom-width: 0px
  }
  .c1an30v3 {
    border-left-width: 0px
  }
  .ca60kt0 {
    background-color: transparent
  }
  .cxlxl0c {
    outline-width: 2px
  }
  .c1gfzcg5 {
    outline-style: solid
  }
  .cohan28 {
    outline-color: transparent
  }
  .c15roejc {
    outline-offset: 2px
  }
  .c1xy5yrr:hover {
    opacity: 1
  }
  .c192vyv4:focus {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
}
      `}
        </style>
        <Page params={{}} />
      </>
    );
  },
};

export { Story as Dialog };
