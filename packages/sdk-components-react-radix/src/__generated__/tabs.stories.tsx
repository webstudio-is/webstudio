import { Box as Box } from "@webstudio-is/sdk-components-react/components";
import {
  Tabs as Tabs,
  TabsList as TabsList,
  TabsTrigger as TabsTrigger,
  TabsContent as TabsContent,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Tabs value={"0"} className={`w-tabs`}>
        <TabsList className={`w-tabs-list w-tabs-list-1`}>
          <TabsTrigger
            data-ws-index="0"
            className={`w-tab-trigger w-tab-trigger-1`}
          >
            {"Account"}
          </TabsTrigger>
          <TabsTrigger
            data-ws-index="1"
            className={`w-tab-trigger w-tab-trigger-2`}
          >
            {"Password"}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          data-ws-index="0"
          className={`w-tab-content w-tab-content-1`}
        >
          {"Make changes to your account here."}
        </TabsContent>
        <TabsContent
          data-ws-index="1"
          className={`w-tab-content w-tab-content-2`}
        >
          {"Change your password here."}
        </TabsContent>
      </Tabs>
    </Box>
  );
};

export default {
  title: "Components/Tabs",
};

const Story = {
  render() {
    return (
      <>
        <style>
          {`
@layer presets {
  div.w-box {
    box-sizing: border-box
  }
  div.w-tabs {
    box-sizing: border-box
  }
  div.w-tab-content {
    box-sizing: border-box
  }
  div.w-tabs-list {
    box-sizing: border-box
  }
  button.w-tab-trigger {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    text-transform: none;
    background-color: transparent;
    background-image: none;
    border: 0px solid rgb(226 232 240 / 1);
    margin: 0;
    padding: 0px
  }
}
@media all {
  .w-tabs-list-1 {
    display: inline-flex;
    height: 2.5rem;
    align-items: center;
    justify-content: center;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    background-color: hsl(210 40% 96.1% / 1);
    color: rgb(100 116 139 / 1);
    padding: 0.25rem
  }
  .w-tab-trigger-1 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-top: 0.375rem;
    padding-right: 0.75rem;
    padding-bottom: 0.375rem;
    padding-left: 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    transition-property: all;
    transition-duration: 150ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: 0s;
    transition-behavior: normal;
    white-space: nowrap;
    white-space-collapse: collapse
  }
  .w-tab-trigger-1:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  .w-tab-trigger-1:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184);
    outline: 2px solid transparent
  }
  .w-tab-trigger-1[data-state="active"] {
    background-color: rgb(255 255 255 / 1);
    color: hsl(222.2 84% 4.9% / 1);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)
  }
  .w-tab-trigger-2 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-top: 0.375rem;
    padding-right: 0.75rem;
    padding-bottom: 0.375rem;
    padding-left: 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    transition-property: all;
    transition-duration: 150ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: 0s;
    transition-behavior: normal;
    white-space: nowrap;
    white-space-collapse: collapse
  }
  .w-tab-trigger-2:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  .w-tab-trigger-2:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184);
    outline: 2px solid transparent
  }
  .w-tab-trigger-2[data-state="active"] {
    background-color: rgb(255 255 255 / 1);
    color: hsl(222.2 84% 4.9% / 1);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)
  }
  .w-tab-content-1 {
    margin-top: 0.5rem
  }
  .w-tab-content-1:focus-visible {
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184);
    outline: medium none currentcolor
  }
  .w-tab-content-2 {
    margin-top: 0.5rem
  }
  .w-tab-content-2:focus-visible {
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184);
    outline: medium none currentcolor
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Tabs };
