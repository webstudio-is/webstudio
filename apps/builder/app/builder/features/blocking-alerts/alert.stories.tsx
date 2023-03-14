import { Alert } from "./alert";

export default { component: Alert };

export const Basic = () => (
  <Alert
    message={
      "Your browser window is too small. Resize your browser to at least 900px wide to continue building with Webstudio."
    }
  />
);
