import { Fragment, createElement } from "react";

export default {
  title: "Webstudio Designer Repository",
};

export const Welcome = () =>
  createElement(Fragment, [
    createElement("p", "Welcome to the Webstudio Designer Repository"),
    createElement("p", "You can browse all of our storybooks here."),
  ]);
