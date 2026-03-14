import { Spinner } from "./spinner";

export default {
  title: "Builder/Dashboard/Spinner",
  component: Spinner,
};

export const Basic = () => (
  <div style={{ position: "relative", width: 400, height: 300 }}>
    <Spinner delay={0} />
  </div>
);

export const SmallSize = () => (
  <div style={{ position: "relative", width: 200, height: 150 }}>
    <Spinner delay={0} size={32} />
  </div>
);
