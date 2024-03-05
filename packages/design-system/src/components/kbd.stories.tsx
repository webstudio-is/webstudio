import { Kbd } from "./kbd";

export default {
  title: "Library/Kbd",
};

const KbdStory = () => <Kbd value={["cmd", "z"]} />;

export { KbdStory as Kbd };
