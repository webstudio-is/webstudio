/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
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
  Image as Image,
} from "@webstudio-is/sdk-components-react";

export const siteName = "Fixture Site";

export const favIconAsset: ImageAsset | undefined = {
  id: "cd1e9fad-8df1-45c6-800f-05fda2d2469f",
  name: "home_wsKvRSqvkajPPBeycZ-C8.svg",
  description: null,
  projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
  size: 3350,
  type: "image",
  format: "svg",
  createdAt: "2023-10-30T20:35:47.113Z",
  meta: { width: 16, height: 16 },
};

export const socialImageAsset: ImageAsset | undefined = {
  id: "ff546bd2-9bb1-4717-a180-1a1fc05565dd",
  name: "_937084ed-a798-49fe-8664-df93a2af605e_1JqSy_0Wy9fY5mXNZSLJ0.jpeg",
  description: null,
  projectId: "0d856812-61d8-4014-a20a-82e01c0eb8ee",
  size: 210614,
  type: "image",
  format: "jpg",
  createdAt: "2024-03-26T18:31:04.086Z",
  meta: { width: 1024, height: 1024 },
};

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

const Page = ({}: { system: any }) => {
  return (
    <Body
      data-ws-id="ibXgMoi9_ipHx1gVrvii0"
      data-ws-component="Body"
      className="crro89i c1ldy0s3 ca0mhw9 c1t3ec4y"
    >
      <Heading
        data-ws-id="7pwqBSgrfuuOfk1JblWcL"
        data-ws-component="Heading"
        className="c12poxag c13p4xw cpwo0o8 cjtvnga c1dgu1f0 c1mko7pq c1ryjtry c1yhbwj4 cm4n0xq c1weo8li"
      >
        {"DO NOT TOUCH THIS PROJECT, IT'S USED FOR FIXTURES"}
      </Heading>
      <Box
        data-ws-id="GMg3Wi9tJBFMtKcwbIK6z"
        data-ws-component="Box"
        className="cxb89wn czqi13r ct7y0ym cy9si0i c1zln9k"
      >
        <Image
          data-ws-id="Mfd_mI-VJtT4r7gICAvXi"
          data-ws-component="Image"
          src={
            "/custom-folder/_937084ed-a798-49fe-8664-df93a2af605e_1JqSy_0Wy9fY5mXNZSLJ0.jpeg"
          }
          width={1024}
          height={1024}
          className="c9mecv c1xeb6ie c1cpdzfi cub4hpc"
        />
        <Box
          data-ws-id="COafOppxs73Ne4O0Geik0"
          data-ws-component="Box"
          className="c9mecv c1xeb6ie c1cpdzfi cub4hpc"
        />
      </Box>
      <Heading data-ws-id="jWb8SRMYG_XPWqCYvGZjo" data-ws-component="Heading">
        {"Below Image"}
      </Heading>
      <HtmlEmbed
        data-ws-id="PI0W8MDhnG1glS5zDm8HQ"
        data-ws-component="HtmlEmbed"
        code={
          "<script>console.log('PAGE MAIN Client')</script>\n<script>console.log('PAGE MAIN 2 Client')</script>\nSCRIPTS ARE HERE <br>"
        }
        clientOnly={true}
      />
      <HtmlEmbed
        data-ws-id="ffuOk2adQRwdmAPbN0C02"
        data-ws-component="HtmlEmbed"
        code={
          "<script>console.log('PAGE MAIN SSR')</script>\n<script>console.log('PAGE MAIN 2 SSR')</script>\nSCRIPTS ARE HERE <br>"
        }
      />
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
        className="c17osjft c53gbe c8mrdqb"
      >
        <VimeoPreviewImage
          data-ws-id="wxd8Wul8dl2yPRFFedNn6"
          data-ws-component="VimeoPreviewImage"
          alt={"Vimeo video preview image"}
          sizes={"100vw"}
          src={"/custom-folder/home_wsKvRSqvkajPPBeycZ-C8.svg"}
          className="c13adha2 c3sa779 c8mrdqb chv0hit c14mu2ti c1dsdrfn c1id445d cf36655 c1dfx0rt"
        />
        <VimeoSpinner
          data-ws-id="o8sAMUoaOraWYZClEfRgl"
          data-ws-component="VimeoSpinner"
          className="c13adha2 c1ifzo79 c1ljqvnn c10zke2u cplzsl2 c1h30nuz czav9qc"
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
          className="c13adha2 c1t88ri8 ca7kf99 c1ifzo79 c1ljqvnn cguufcz c1an2y3u cxb89wn c1h8v1ng c19cfw6s cv7bbk3 c1tly7k c8mtcs c7jk6jf c17y59v6 c1d4fd4d c1yj9i1y c1xqoqjh cil01r8 crmtz4w coba2o7 c11eux2f"
        >
          <Box
            data-ws-id="D__QElBIIQtamhJN3a4FI"
            data-ws-component="Box"
            aria-hidden={"true"}
            className="c1cccshn c1eyznz"
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
