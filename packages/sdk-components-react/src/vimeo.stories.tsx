import { VimeoPreviewImage } from "./vimeo-preview-image";
import { Box } from "./box";
import { HtmlEmbed } from "./html-embed";
import { VimeoPlayButton } from "./vimeo-play-button";
import { Vimeo } from "./vimeo";

const Component = () => (
  <Vimeo
    data-ws-id="ZkDuD4HlHP3pDdp0SXJuh"
    data-ws-component="Vimeo"
    url={"https://player.vimeo.com/video/831343124"}
    showPreview={true}
    className="ca1m5u0 ciuvvr7 cuk1bdz"
  >
    <VimeoPreviewImage
      data-ws-id="wxd8Wul8dl2yPRFFedNn6"
      data-ws-component="VimeoPreviewImage"
      alt={"Vimeo video preview image"}
      sizes={"100vw"}
      src={"/home_wsKvRSqvkajPPBeycZ-C8.svg"}
      className="c1eccbi0 cc32szi cuk1bdz c1ge5ofh c1fwh0y5 ch160p4 c1jxoq3x cewch87 c1la265j"
    />
    <Box
      data-ws-id="CnbJrVYAMQ7aDqemVdWI5"
      data-ws-component="Box"
      className="c1eccbi0 ce5jzw0 cq3eebu c1319rdz c1x7j4n5 c176tfq4 c1qg633k"
    >
      <HtmlEmbed
        data-ws-id="JeL4m1QcrRyK7gPyN3p5j"
        data-ws-component="HtmlEmbed"
        code={
          '<svg xmlns="http://www.w3.org/2000/svg" id="e2CRglijn891" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" viewBox="0 0 128 128" fill="currentColor" width="100%" height="100%" style="display: block;"><style>@keyframes e2CRglijn892_tr__tr{0%{transform:translate(64px,64px) rotate(90deg);animation-timing-function:cubic-bezier(.42,0,.58,1)}50%{transform:translate(64px,64px) rotate(810deg);animation-timing-function:cubic-bezier(.42,0,.58,1)}to{transform:translate(64px,64px) rotate(1530deg)}}@keyframes e2CRglijn892_s_p{0%,to{stroke:#39fbbb}25%{stroke:#4a4efa}50%{stroke:#e63cfe}75%{stroke:#ffae3c}}@keyframes e2CRglijn892_s_do{0%{stroke-dashoffset:251.89}2.5%,52.5%{stroke-dashoffset:263.88;animation-timing-function:cubic-bezier(.42,0,.58,1)}25%,75%{stroke-dashoffset:131.945}to{stroke-dashoffset:251.885909}}#e2CRglijn892_tr{animation:e2CRglijn892_tr__tr 3000ms linear infinite normal forwards}#e2CRglijn892{animation-name:e2CRglijn892_s_p,e2CRglijn892_s_do;animation-duration:3000ms;animation-fill-mode:forwards;animation-timing-function:linear;animation-direction:normal;animation-iteration-count:infinite}</style><g id="e2CRglijn892_tr" transform="translate(64,64) rotate(90)"><circle id="e2CRglijn892" r="42" fill="none" stroke="#39fbbb" stroke-dasharray="263.89" stroke-dashoffset="251.89" stroke-linecap="round" stroke-width="16" transform="scale(-1,1) translate(0,0)"/></g></svg>'
        }
      />
    </Box>
    <VimeoPlayButton
      data-ws-id="9hBBPGSf7hB30ZkSHKjNd"
      data-ws-component="VimeoPlayButton"
      aria-label={"Play button"}
      className="c1eccbi0 c1yx3ait c1scl4ay ce5jzw0 cq3eebu cxar3by c1fiqkhd c1b095zn cyw79s9 c2f7s8e c9bs64c c6lou2r c16c73ai c1fisnnh c82rye8 c1xaktbd c1xplc5b c5admkk ccn3fhu cyn2bny c1xs2zvh c1be0m8p"
    >
      <Box
        data-ws-id="D__QElBIIQtamhJN3a4FI"
        data-ws-component="Box"
        aria-hidden={"true"}
        className="c14af118 c1xa5m0w"
      >
        <HtmlEmbed
          data-ws-id="iEc6hab-WardXZc5P9wJu"
          data-ws-component="HtmlEmbed"
          code={
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.766 5.765c0-.725 0-1.088.178-1.288a.93.93 0 0 1 .648-.294c.294-.015.65.186 1.359.588l9.234 5.235c.586.332.88.498.982.708.09.183.09.389 0 .572-.102.21-.396.376-.982.708l-9.234 5.235c-.71.402-1.065.603-1.359.588a.93.93 0 0 1-.648-.294c-.178-.2-.178-.563-.178-1.288V5.765Z"/></svg>'
          }
        />
      </Box>
    </VimeoPlayButton>
  </Vimeo>
);

const Story = {
  render() {
    return (
      <>
        <style>
          {`
html {
  margin: 0;
  display: grid;
  min-height: 100%;
}
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
    -moz-osx-font-smoothing: grayscale;
  }
  h1:where([data-ws-component="Heading"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  h2:where([data-ws-component="Heading"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  h3:where([data-ws-component="Heading"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  h4:where([data-ws-component="Heading"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  h5:where([data-ws-component="Heading"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  h6:where([data-ws-component="Heading"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  a:where([data-ws-component="Link"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    min-height: 1em;
    display: inline-block;
  }
  div:where([data-ws-component="Vimeo"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  img:where([data-ws-component="VimeoPreviewImage"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    max-width: 100%;
    display: block;
  }
  div:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  address:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  article:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  aside:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  figure:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  footer:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  header:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  main:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  nav:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  section:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
  }
  button:where([data-ws-component="VimeoPlayButton"]) {
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
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    text-transform: none;
  }
}
@media all {
  .c11x2bo2 {
    font-size: 4em;
  }
  .cykwawo {
    font-family: "Cormorant Garamond", sans-serif;
  }
  .c1qmshyz {
    background-attachment: scroll, scroll, scroll;
  }
  .c12wnxll {
    -webkit-background-clip: border-box, border-box, border-box;
  }
  .c1hzshzo {
    background-blend-mode: normal, normal, normal;
  }
  .c136ve95 {
    background-image: linear-gradient(
        rgba(255, 0, 0, 0.2),
        rgba(0, 255, 255, 0.2)
      ),
      url("/home_wsKvRSqvkajPPBeycZ-C8.svg"),
      linear-gradient(to right, rgba(255, 0, 255, 0.2), rgba(0, 255, 0, 0.2));
  }
  .cyttr60 {
    background-origin: padding-box, padding-box, padding-box;
  }
  .c1cywb85 {
    background-position: 0%, 0%, 0%;
  }
  .c187ui6a {
    background-repeat: repeat, repeat, repeat;
  }
  .c1azrtl7 {
    background-size: auto, auto, auto;
  }
  .c1vynykc {
    margin-top: 15px;
  }
  .c122cnm9 {
    margin-bottom: 15px;
  }
  .c15qd3jj {
    margin-right: 15px;
  }
  .c1jp5sfs {
    margin-left: 15px;
  }
  .ca1m5u0 {
    position: relative;
  }
  .ciuvvr7 {
    aspect-ratio: 640/360;
  }
  .cuk1bdz {
    width: 100%;
  }
  .c1eccbi0 {
    position: absolute;
  }
  .cc32szi {
    object-fit: cover;
  }
  .c1ge5ofh {
    height: 100%;
  }
  .c1fwh0y5 {
    border-top-left-radius: 20px;
  }
  .ch160p4 {
    border-top-right-radius: 20px;
  }
  .c1jxoq3x {
    border-bottom-left-radius: 20px;
  }
  .cewch87 {
    border-bottom-right-radius: 20px;
  }
  .c1la265j {
    object-position: cover;
  }
  .ce5jzw0 {
    top: 50%;
  }
  .cq3eebu {
    left: 50%;
  }
  .c1319rdz {
    width: 70px;
  }
  .c1x7j4n5 {
    height: 70px;
  }
  .c176tfq4 {
    margin-top: -35px;
  }
  .c1qg633k {
    margin-left: -35px;
  }
  .c1yx3ait {
    width: 140px;
  }
  .c1scl4ay {
    height: 80px;
  }
  .cxar3by {
    margin-top: -40px;
  }
  .c1fiqkhd {
    margin-left: -70px;
  }
  .c1b095zn {
    display: flex;
  }
  .cyw79s9 {
    align-items: center;
  }
  .c2f7s8e {
    justify-content: center;
  }
  .c9bs64c {
    border-top-style: none;
  }
  .c6lou2r {
    border-right-style: none;
  }
  .c16c73ai {
    border-bottom-style: none;
  }
  .c1fisnnh {
    border-left-style: none;
  }
  .c82rye8 {
    border-top-left-radius: 5px;
  }
  .c1xaktbd {
    border-top-right-radius: 5px;
  }
  .c1xplc5b {
    border-bottom-left-radius: 5px;
  }
  .c5admkk {
    border-bottom-right-radius: 5px;
  }
  .ccn3fhu {
    cursor: pointer;
  }
  .cyn2bny {
    background-color: rgba(18, 18, 18, 1);
  }
  .c1xs2zvh {
    color: rgba(255, 255, 255, 1);
  }
  .c1be0m8p:hover {
    background-color: rgba(0, 173, 239, 1);
  }
  .c14af118 {
    width: 60px;
  }
  .c1xa5m0w {
    height: 60px;
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Vimeo };

export default {
  title: "Components/Vimeo",
};
