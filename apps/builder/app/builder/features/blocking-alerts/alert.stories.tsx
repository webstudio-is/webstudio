import { Alert } from "./alert";

export default { title: "Blocking Alerts", component: Alert };

export const BlockingAlerts = () => (
  <Alert
    message={
      "Your browser window is too small. Resize your browser to at least 900px wide to continue building with Webstudio."
    }
  />
);
