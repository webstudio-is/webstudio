/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { FontAsset, ImageAsset } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import {
  Body as Body,
  RemixForm as RemixForm,
  Link as Link,
} from "@webstudio-is/sdk-components-react-remix";
import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
  Button as Button,
  Input as Input,
  Image as Image,
  Heading as Heading,
  Paragraph as Paragraph,
} from "@webstudio-is/sdk-components-react";
import {
  Select as Select,
  SelectTrigger as SelectTrigger,
  SelectValue as SelectValue,
  SelectContent as SelectContent,
  SelectViewport as SelectViewport,
  SelectItem as SelectItem,
  SelectItemIndicator as SelectItemIndicator,
  SelectItemText as SelectItemText,
} from "@webstudio-is/sdk-components-react-radix";

export const favIconAsset: ImageAsset | undefined = undefined;

export const socialImageAsset: ImageAsset | undefined = undefined;

// Font assets on current page (can be preloaded)
export const pageFontAssets: FontAsset[] = [];

export const pageBackgroundImageAssets: ImageAsset[] = [];

const Page = ({ system: system }: { system: any }) => {
  let [Languages, set$Languages] = useState<any>(["en", "de"]);
  let [LanguageIndexes, set$LanguageIndexes] = useState<any>([0, 1]);
  let Products = useResource("Products_1");
  let [selectValue, set$selectValue] = useState<any>("");
  let [selectOpen, set$selectOpen] = useState<any>(false);
  let [DEFAULT_LANGUAGE, set$DEFAULT_LANGUAGE] = useState<any>("en");
  return (
    <Body
      data-ws-id="AmarOIUlWu0dTyKjL7H8H"
      data-ws-component="Body"
      className="c9w0js3 crec23g czf3p0a c1frozhb c12rmqio c1ws6qna"
    >
      <Box
        data-ws-id="q5kLZJxuRVMoBqucmqNfz"
        data-ws-component="Box"
        className="cfs62og cm9gm7b clyyici ccas8a6 c1tklczs cu11urf"
      >
        {[Products?.data?.data?.currentCategory?.[0]?.localizations]?.map(
          (LocalizedSlugs: any, index_1: number) => (
            <Fragment key={index_1}>
              {LanguageIndexes?.map((LanguageIndex: any, index: number) => (
                <Fragment key={index}>
                  <RemixForm
                    data-ws-id="lxHUhdJKLisJkpEtRLyGo"
                    data-ws-component="RemixForm"
                    id={""}
                  >
                    {(LocalizedSlugs?.[LanguageIndex]?.slug ?? false) && (
                      <Input
                        data-ws-id="v7h_R0oVSCr-bVR5y0BWP"
                        data-ws-component="Input"
                        name={"category"}
                        defaultValue={LocalizedSlugs?.[LanguageIndex]?.slug}
                        type={"hidden"}
                      />
                    )}
                    <Button
                      data-ws-id="gUaYeiumIbJvEntYpVwwK"
                      data-ws-component="Button"
                      name={"lang"}
                      value={Languages?.[LanguageIndex]}
                      disabled={
                        Languages?.[LanguageIndex] ==
                        (system?.search?.lang ?? "en")
                      }
                    >
                      {Languages?.[LanguageIndex]}
                    </Button>
                  </RemixForm>
                </Fragment>
              ))}
            </Fragment>
          )
        )}
      </Box>
      <Box
        data-ws-id="CV8st0hc2thOpKCjU1KN6"
        data-ws-component="Box"
        className="cfs62og cl3aj52 cg5osat c1ps6q8g"
      >
        <Box
          data-ws-id="wriIWi6Dqr8-gCoDwZOBM"
          data-ws-component="Box"
          className="c1d88vbv cfs62og"
        >
          <RemixForm
            data-ws-id="Kx8Qljjn_vS4EJlD2ZZz6"
            data-ws-component="RemixForm"
            action={""}
            className="c8l3v1d"
          >
            <Select
              data-ws-id="mMdqa4tA75pSHgtgFrsrr"
              data-ws-component="@webstudio-is/sdk-components-react-radix:Select"
              value={system?.search?.imnotexists}
              onValueChange={(value: any) => {
                selectValue = value;
                set$selectValue(selectValue);
              }}
              open={selectOpen}
              onOpenChange={(open: any) => {
                selectOpen = open;
                set$selectOpen(selectOpen);
              }}
              name={"category"}
              defaultValue={Products?.data?.data?.currentCategory?.[0]?.slug}
              key={Products?.data?.data?.currentCategory?.[0]?.slug}
            >
              <SelectTrigger
                data-ws-id="K-8DWN3IGXiU5qWZpm6h2"
                data-ws-component="@webstudio-is/sdk-components-react-radix:SelectTrigger"
                className="cfs62og c1169emm cpoa22m ccas8a6 c1ft3tuv c1s7jy0x c5gvgbl cgkz31j ctw4ral c1wv10mq c1a8nxfp c11ketvx c1vgakz9 c1foa4db c1718jv3 c1d0efu2 cjm20zn c11h88u c1mkv626 cdb0mby c11jxz56 caau6y c1yffdjf cp7q94q cejtojh c18wkwoh c1e35tqm c4q3njg c18cnn0q crxnevd coh2pta c6p0elp c101i5gm chtmsd6 cmp9xw5 c15r3j0z c15f9rki"
              >
                <SelectValue
                  data-ws-id="F1yaaH2Fus3I-cK4xkpvj"
                  data-ws-component="@webstudio-is/sdk-components-react-radix:SelectValue"
                  placeholder={"Select Category"}
                />
              </SelectTrigger>
              <SelectContent
                data-ws-id="JcFOzVZXIulsOBqjVsua6"
                data-ws-component="@webstudio-is/sdk-components-react-radix:SelectContent"
                className="c9hoajy c1top526 c1rqfzp1 c1l3qjqn c1s7jy0x c5gvgbl cgkz31j ctw4ral c1wv10mq c1a8nxfp c11ketvx c1vgakz9 c1foa4db c1718jv3 c1d0efu2 cjm20zn c11h88u c1mkv626 cdb0mby c11jxz56 c2fgzrl c1fxvknb ce6ck7y"
              >
                <SelectViewport
                  data-ws-id="ddiQzjjYkfSvNjua08_hy"
                  data-ws-component="@webstudio-is/sdk-components-react-radix:SelectViewport"
                  className="c1yfepmk ccumtru c1w43h8 cp6sgc9 c1kpe86h cpoa22m c1nwehpe"
                >
                  {Products?.data?.data?.categories?.map(
                    (Category: any, index_2: number) => (
                      <Fragment key={index_2}>
                        <SelectItem
                          data-ws-id="VLRDUM1PL1Ohoy4GCaBMJ"
                          data-ws-component="@webstudio-is/sdk-components-react-radix:SelectItem"
                          value={Category?.slug}
                          className="c9hoajy cfs62og cpoa22m cew4vof c1gk28c6 ccas8a6 c1s7jy0x c5gvgbl cgkz31j ctw4ral c170nyhs cfcevo2 cjzp38g c16233g c1e35tqm c4q3njg ci81qpb c4pnk22 c2ehbtt c1ttg34v c1toxws7 c15mfvu c139uqwg c150if85"
                        >
                          <SelectItemIndicator
                            data-ws-id="djgA5BIeVQAboLmRAIAMx"
                            data-ws-component="@webstudio-is/sdk-components-react-radix:SelectItemIndicator"
                            className="c1d71f7l cqbn13w cfs62og c1f4msbl c1bkdfak ccas8a6 c2exht7"
                          >
                            <HtmlEmbed
                              data-ws-id="MkYOv-0Es1zLagfDiRtvt"
                              data-ws-component="HtmlEmbed"
                              code={
                                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                              }
                            />
                          </SelectItemIndicator>
                          <SelectItemText
                            data-ws-id="gzUbrfflcFrEeRJxDWhAb"
                            data-ws-component="@webstudio-is/sdk-components-react-radix:SelectItemText"
                          >
                            {Category?.name}
                          </SelectItemText>
                        </SelectItem>
                      </Fragment>
                    )
                  )}
                </SelectViewport>
              </SelectContent>
            </Select>
            <Input
              data-ws-id="6hnxhnypeMC4yXoAa5W7J"
              data-ws-component="Input"
              name={"lang"}
              defaultValue={system?.search?.lang ?? DEFAULT_LANGUAGE}
              type={"hidden"}
            />
            <HtmlEmbed
              data-ws-id="HnHLaeg6B0zKQXRfyXLPq"
              data-ws-component="HtmlEmbed"
              code={
                '<script id="auto-select">\ndocument.getElementById("auto-select")\n  .closest("form")\n  .addEventListener(\'change\', (event) => {\n    const form = event.target.form;\n    (form?.requestSubmit ?? form.submit).bind(form)();\n  })\n</script>'
              }
            />
          </RemixForm>
          <RemixForm
            data-ws-id="PeWd4VHInkn-iVp7IgEN8"
            data-ws-component="RemixForm"
            className="c8l3v1d"
          >
            <Button
              data-ws-id="VEteI5FOvhSQtSK5Xzjt_"
              data-ws-component="Button"
            >
              {"Reset"}
              {""}
              <br />
              {""}
            </Button>
            <Input
              data-ws-id="Oao4qVul53zLtnA5EkyNN"
              data-ws-component="Input"
              name={"lang"}
              defaultValue={system?.search?.lang == "de" ? "de" : "en"}
              type={"hidden"}
            />
          </RemixForm>
        </Box>
        {Products?.data?.data?.products?.map(
          (Product: any, index_3: number) => (
            <Fragment key={index_3}>
              <Link
                data-ws-id="ejwmzA4lK7_L2TSvX-LFY"
                data-ws-component="Link"
                href={`${Product?.locale}/item/${Product?.slug}`}
                className="cfs62og c1nmdfll ct6klrt c5qziui c10rykhr c4o9sxs"
              >
                <Box
                  data-ws-id="b5A_h90bJf530q84lg9eS"
                  data-ws-component="Box"
                  className="c1leavt2 c18cnn0q c1b47b4b"
                >
                  <Heading
                    data-ws-id="EbPWw8v36JReSxvHGEI1M"
                    data-ws-component="Heading"
                  >
                    {Product?.name}
                  </Heading>
                  <Paragraph
                    data-ws-id="_AgKfFiobl0HLVTdvJ-uz"
                    data-ws-component="Paragraph"
                  >
                    {Product?.description}
                  </Paragraph>
                </Box>
                <Image
                  data-ws-id="P6iK9e2dxV7qu_cqDPnNc"
                  data-ws-component="Image"
                  src={Product?.images?.[0]?.url}
                  width={Product?.images?.[0]?.width}
                  height={Product?.images?.[0]?.height}
                  className="c161mlss c1leavt2 c18cnn0q c1b47b4b"
                />
              </Link>
            </Fragment>
          )
        )}
      </Box>
      <Box
        data-ws-id="0Gw29ThZ6gQYxiDMq5m2D"
        data-ws-component="Box"
        className="c1q6wzbb cfs62og c1brz1nu c15e31qz"
      >
        {Products?.data?.data?.categories?.map(
          (Category_1: any, index_4: number) => (
            <Fragment key={index_4}>
              <RemixForm
                data-ws-id="8z9mri_76RUujkDDNST4W"
                data-ws-component="RemixForm"
              >
                <Input
                  data-ws-id="YaM4RXEtqVKRON4iI_SoN"
                  data-ws-component="Input"
                  defaultValue={system?.search?.lang ?? DEFAULT_LANGUAGE}
                  type={"hidden"}
                  name={"lang"}
                />
                <Button
                  data-ws-id="w6dK8sm6pjo6KlWmagBHB"
                  data-ws-component="Button"
                  name={"category"}
                  value={Category_1?.slug}
                >
                  {Category_1?.name}
                </Button>
              </RemixForm>
            </Fragment>
          )
        )}
      </Box>
    </Body>
  );
};

export { Page };
