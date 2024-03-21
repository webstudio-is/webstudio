/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource } from "@webstudio-is/react-sdk";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";
import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
} from "@webstudio-is/sdk-components-react";

const Page = ({}: { system: any }) => {
  let list = useResource("list_1");
  return (
    <Body data-ws-id="AWY2qZfpbykoiWELeJhse" data-ws-component="Body">
      {list?.data?.map((collectionItem: any, index: number) => (
        <Fragment key={index}>
          <Box data-ws-id="-F-b3eIEZ8WKW_F-Aw8nN" data-ws-component="Box">
            <HtmlEmbed
              data-ws-id="05oK4Ks0ocFv3w8MJOcNR"
              data-ws-component="HtmlEmbed"
              code={collectionItem?.name}
            />
          </Box>
        </Fragment>
      ))}
    </Body>
  );
};

export { Page };
