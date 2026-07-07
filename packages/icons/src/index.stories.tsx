import type { ReactNode } from "react";
import type { Meta } from "@storybook/react";
import { StorySection } from "@webstudio-is/design-system";
import * as icons from "./index";

export const Icons = ({
  testColor = false,
}: {
  testColor?: boolean;
}): ReactNode => {
  return (
    <StorySection title="Icons">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          ...(testColor ? { color: "red" } : {}),
        }}
      >
        {Object.entries(icons).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ([name, Icon]: [string, any]) => {
            if (name.endsWith("Icon") === false) {
              return null;
            }
            return (
              <div
                key={name}
                style={{
                  width: 150,
                  height: 100,
                  margin: 5,
                  padding: 5,
                  border: "solid 1px #f5f5f5",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon width="32" height="32" color="black" />
                <div
                  style={{
                    marginTop: 16,
                    fontFamily: "Arial",
                    textAlign: "center",
                    wordWrap: "break-word",
                    width: "100%",
                    fontSize: "14px",
                    color: "#5a5a5a",
                  }}
                >
                  {name.replace(/Icon$/, "")}
                </div>
              </div>
            );
          }
        )}
      </div>
    </StorySection>
  );
};

const IconsMeta: Meta<typeof Icons> = {
  title: "Icons",
  component: Icons,
};
export default IconsMeta;
