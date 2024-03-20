/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type {
  Asset,
  FontAsset,
  ImageAsset,
  ProjectMeta,
} from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import {
  Body as Body,
  Link as Link,
} from "@webstudio-is/sdk-components-react-remix";
import {
  Heading as Heading,
  Vimeo as Vimeo,
  VimeoPreviewImage as VimeoPreviewImage,
  VimeoPlayButton as VimeoPlayButton,
  Box as Box,
  HtmlEmbed as HtmlEmbed,
  VimeoSpinner as VimeoSpinner,
} from "@webstudio-is/sdk-components-react";

import type { PageData } from "~/routes/_index";
export const imageAssets: ImageAsset[] = [
  {
    id: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
    name: "home_wsKvRSqvkajPPBeycZ-C8.svg",
    description: null,
    projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
    size: 3350,
    type: "image",
    format: "svg",
    createdAt: "2023-10-30T20:35:47.113Z",
    meta: { width: 16, height: 16 },
  },
];

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [
  {
    id: "a8fb692a-5970-4014-ad4d-45c6f1edea36",
    name: "CormorantGaramond-Medium_-nWJ-OtHncaW9xDHQ9hSA_CBl88Oo59QKH_z9pCWva2.woff2",
    description: null,
    projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
    size: 156212,
    type: "font",
    createdAt: "2024-02-22T05:36:52.004Z",
    format: "woff2",
    meta: { family: "Cormorant Garamond", style: "normal", weight: 500 },
  },
];

export const pageBackgroundImageAssets: ImageAsset[] = [
  {
    id: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
    name: "home_wsKvRSqvkajPPBeycZ-C8.svg",
    description: null,
    projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
    size: 3350,
    type: "image",
    format: "svg",
    createdAt: "2023-10-30T20:35:47.113Z",
    meta: { width: 16, height: 16 },
  },
];

export const pageData: PageData = {
  project: {
    siteName: "Fixture Site",
    faviconAssetId: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
    code: '<script>console.log(\'HELLO\')</script>\n<meta property="saas:test" content="test">',
  },
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "0d856812-61d8-4014-a20a-82e01c0eb8ee";

const Page = ({}: { system: any }) => {
  return (
    <Body
      data-ws-id="ibXgMoi9_ipHx1gVrvii0"
      data-ws-component="Body"
      className="c1vynykc c15qd3jj c122cnm9 c1jp5sfs"
    >
      <Heading
        data-ws-id="7pwqBSgrfuuOfk1JblWcL"
        data-ws-component="Heading"
        className="c11x2bo2 cykwawo c1qmshyz c12wnxll c1hzshzo c136ve95 cyttr60 c1cywb85 c187ui6a c1azrtl7"
      >
        {"DO NOT TOUCH THIS PROJECT, IT'S USED FOR FIXTURES"}
      </Heading>
      <Link
        data-ws-id="QzTSoZnbGD6luZ5xcv893"
        data-ws-component="Link"
        href={"/script-test"}
      >
        {"Goto Scr"}
      </Link>
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
          src={"/custom-folder/home_wsKvRSqvkajPPBeycZ-C8.svg"}
          className="c1eccbi0 cc32szi cuk1bdz c1ge5ofh c1fwh0y5 ch160p4 c1jxoq3x cewch87 c1la265j"
        />
        <VimeoSpinner
          data-ws-id="o8sAMUoaOraWYZClEfRgl"
          data-ws-component="VimeoSpinner"
          className="c1eccbi0 ce5jzw0 cq3eebu c1319rdz c1x7j4n5 c176tfq4 c1qg633k"
        >
          <HtmlEmbed
            data-ws-id="BeQ7sgDlUizFvf4aHqOsh"
            data-ws-component="HtmlEmbed"
            code={
              '<svg xmlns="http://www.w3.org/2000/svg" id="e2CRglijn891" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" viewBox="0 0 128 128" fill="currentColor" width="100%" height="100%" style="display: block;"><style>@keyframes e2CRglijn892_tr__tr{0%{transform:translate(64px,64px) rotate(90deg);animation-timing-function:cubic-bezier(.42,0,.58,1)}50%{transform:translate(64px,64px) rotate(810deg);animation-timing-function:cubic-bezier(.42,0,.58,1)}to{transform:translate(64px,64px) rotate(1530deg)}}@keyframes e2CRglijn892_s_p{0%,to{stroke:#39fbbb}25%{stroke:#4a4efa}50%{stroke:#e63cfe}75%{stroke:#ffae3c}}@keyframes e2CRglijn892_s_do{0%{stroke-dashoffset:251.89}2.5%,52.5%{stroke-dashoffset:263.88;animation-timing-function:cubic-bezier(.42,0,.58,1)}25%,75%{stroke-dashoffset:131.945}to{stroke-dashoffset:251.885909}}#e2CRglijn892_tr{animation:e2CRglijn892_tr__tr 3000ms linear infinite normal forwards}#e2CRglijn892{animation-name:e2CRglijn892_s_p,e2CRglijn892_s_do;animation-duration:3000ms;animation-fill-mode:forwards;animation-timing-function:linear;animation-direction:normal;animation-iteration-count:infinite}</style><g id="e2CRglijn892_tr" transform="translate(64,64) rotate(90)"><circle id="e2CRglijn892" r="42" fill="none" stroke="#39fbbb" stroke-dasharray="263.89" stroke-dashoffset="251.89" stroke-linecap="round" stroke-width="16" transform="scale(-1,1) translate(0,0)"/></g></svg>'
            }
            executeScriptOnCanvas={false}
          />
        </VimeoSpinner>
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
    </Body>
  );
};

export { Page };
