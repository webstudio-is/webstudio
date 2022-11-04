import * as icons from "./index";

export const Icons = () => {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
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
              <div
                style={{
                  display: "flex",
                  width: 16,
                  height: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Icon />
              </div>
              <div
                style={{
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
  );
};

export default {
  title: "All Icons",
  component: Icons,
};
