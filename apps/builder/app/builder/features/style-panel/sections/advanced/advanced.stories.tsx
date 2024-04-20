import { Section } from "./advanced";

const currentStyle = {
  accentColor: {
    value: {
      type: "keyword",
      value: "red",
    },
    local: {
      type: "keyword",
      value: "red",
    },
  },
  alignContent: {
    value: {
      type: "keyword",
      value: "normal",
    },
    local: {
      type: "keyword",
      value: "normal",
    },
  },
  opacity: {
    value: {
      type: "unit",
      unit: "number",
      value: 11.2,
    },
    local: {
      type: "unit",
      unit: "number",
      value: 11.2,
    },
  },
} as const;

export const Advanced = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = {} as any;
  return <Section currentStyle={currentStyle} {...props} />;
};

export default {
  title: "Style Panel/Advanced",
  component: Advanced,
};
