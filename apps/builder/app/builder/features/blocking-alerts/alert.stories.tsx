import { StorySection } from "@webstudio-is/design-system";
import { Alert } from "./alert";
import { UnsupportedBrowserDialog } from "./blocking-alerts";

export default { title: "Blocking Alerts", component: Alert };

export const BlockingAlerts = () => (
  <StorySection title="Blocking Alerts">
    <Alert
      message={
        "Your browser window is too small. Resize your browser to at least 900px wide to continue building with Webstudio."
      }
    />
  </StorySection>
);

export const UnsupportedBrowser = () => (
  <StorySection title="Unsupported browser">
    <UnsupportedBrowserDialog onDismiss={() => {}} />
  </StorySection>
);
