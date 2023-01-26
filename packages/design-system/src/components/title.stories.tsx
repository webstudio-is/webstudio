import { Title, TitleSuffixSpacer } from "./title";
import { Button } from "./button";
import { CrossIcon, CopyIcon } from "@webstudio-is/icons";

export default {
  title: "Library/Title",
};

const TitleStory = () => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 16, width: 360 }}
  >
    <Title>Without buttons</Title>

    <Title suffix={<Button prefix={<CrossIcon />} variant="ghost" />}>
      One icon button
    </Title>

    <Title
      suffix={
        <>
          <Button prefix={<CrossIcon />} variant="ghost" />
          <Button prefix={<CopyIcon />} variant="ghost" />
        </>
      }
    >
      Many icon buttons
    </Title>

    <Title
      suffix={
        <>
          <Button prefix={<CrossIcon />} variant="ghost" />
          <Button prefix={<CopyIcon />} variant="ghost" />
          <TitleSuffixSpacer />
          <Button>Button</Button>
        </>
      }
    >
      Icon and regular buttons
    </Title>
  </div>
);

export { TitleStory as Title };
