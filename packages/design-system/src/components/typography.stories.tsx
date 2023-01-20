import { typography } from "./typography";

export const Typography = () => (
  <div>
    {Object.entries(typography).map(([key, value]) => (
      <div
        key={key}
        style={{ border: "dotted 1px", padding: "4px 10px", margin: "10px" }}
      >
        <p className={typography.regular()}>{key}:</p>
        <p className={value()}>The quick brown fox jumps over the lazy dog</p>
      </div>
    ))}
  </div>
);

export default {
  title: "Components/Typography",
  component: Typography,
};
