import {
  Box as Box,
  YouTube as YouTube,
  VimeoPreviewImage as VimeoPreviewImage,
  VimeoSpinner as VimeoSpinner,
  HtmlEmbed as HtmlEmbed,
  VimeoPlayButton as VimeoPlayButton,
} from "../components";

const Component = () => {
  return (
    <Box className={"w-box"}>
      <YouTube className={"w-you-tube w-you-tube-1"}>
        <VimeoPreviewImage
          alt={"Vimeo video preview image"}
          sizes={"100vw"}
          optimize={true}
          className={"w-preview-image w-preview-image-1"}
        />
        <VimeoSpinner className={"w-spinner w-spinner-1"}>
          <HtmlEmbed
            code={
              '<svg xmlns="http://www.w3.org/2000/svg" id="e2CRglijn891" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" viewBox="0 0 128 128" fill="currentColor" width="100%" height="100%" style="display: block;"><style>@keyframes e2CRglijn892_tr__tr{0%{transform:translate(64px,64px) rotate(90deg);animation-timing-function:cubic-bezier(.42,0,.58,1)}50%{transform:translate(64px,64px) rotate(810deg);animation-timing-function:cubic-bezier(.42,0,.58,1)}to{transform:translate(64px,64px) rotate(1530deg)}}@keyframes e2CRglijn892_s_p{0%,to{stroke:#39fbbb}25%{stroke:#4a4efa}50%{stroke:#e63cfe}75%{stroke:#ffae3c}}@keyframes e2CRglijn892_s_do{0%{stroke-dashoffset:251.89}2.5%,52.5%{stroke-dashoffset:263.88;animation-timing-function:cubic-bezier(.42,0,.58,1)}25%,75%{stroke-dashoffset:131.945}to{stroke-dashoffset:251.885909}}#e2CRglijn892_tr{animation:e2CRglijn892_tr__tr 3000ms linear infinite normal forwards}#e2CRglijn892{animation-name:e2CRglijn892_s_p,e2CRglijn892_s_do;animation-duration:3000ms;animation-fill-mode:forwards;animation-timing-function:linear;animation-direction:normal;animation-iteration-count:infinite}</style><g id="e2CRglijn892_tr" transform="translate(64,64) rotate(90)"><circle id="e2CRglijn892" r="42" fill="none" stroke="#39fbbb" stroke-dasharray="263.89" stroke-dashoffset="251.89" stroke-linecap="round" stroke-width="16" transform="scale(-1,1) translate(0,0)"/></g></svg>'
            }
            className={"w-html-embed"}
          />
        </VimeoSpinner>
        <VimeoPlayButton
          aria-label={"Play button"}
          className={"w-play-button w-play-button-1"}
        >
          <Box aria-hidden={true} className={"w-box w-play-icon"}>
            <HtmlEmbed
              code={
                '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="m4 2 9.333 6L4 14V2Z"/></svg>'
              }
              className={"w-html-embed"}
            />
          </Box>
        </VimeoPlayButton>
      </YouTube>
    </Box>
  );
};

export default {
  title: "Components/YouTube",
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
  :where(div.w-html-embed) {
    display: contents;
    white-space: normal;
    white-space-collapse: collapse
  }
  :where(button.w-play-button) {
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
  :where(img.w-preview-image) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    max-width: 100%;
    display: block;
    height: auto
  }
  :where(div.w-spinner) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-you-tube) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
}
@media all {
  .w-you-tube-1 {
    position: relative;
    aspect-ratio: 640/360;
    width: 100%
  }
  .w-preview-image-1 {
    position: absolute;
    object-fit: cover;
    object-position: cover;
    width: 100%;
    height: 100%;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    border-bottom-right-radius: 20px;
    border-bottom-left-radius: 20px
  }
  .w-spinner-1 {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 70px;
    height: 70px;
    margin-top: -35px;
    margin-left: -35px
  }
  .w-play-button-1 {
    position: absolute;
    width: 140px;
    height: 80px;
    top: 50%;
    left: 50%;
    margin-top: -40px;
    margin-left: -70px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-top-style: none;
    border-right-style: none;
    border-bottom-style: none;
    border-left-style: none;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
    border-bottom-left-radius: 5px;
    cursor: pointer;
    background-color: rgba(18, 18, 18, 1);
    color: rgba(255, 255, 255, 1)
  }
  .w-play-button-1:hover {
    background-color: rgba(0, 173, 239, 1)
  }
  .w-play-icon {
    width: 60px;
    height: 60px
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as YouTube };
