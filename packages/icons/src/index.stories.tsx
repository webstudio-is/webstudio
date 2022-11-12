import * as icons from "./index";
import * as legacyIcons from "./legacy";

export const Icons = () => {
  return (
    <>
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
                <Icon width="32" height="32" />
                <div
                  style={{
                    marginTop: 16,
                    fontFamily: "Arial",
                    textAlign: "center",
                    wordWrap: "break-word",
                    width: "100%",
                    fontSize: "$fontSize$4",
                    color: "#5a5a5a",
                  }}
                >
                  {name.replace(/Icon$/, "")}
                  {name in legacyIcons && " (legacy)"}
                </div>
              </div>
            );
          }
        )}
      </div>
    </>
  );
};

export default {
  title: "All Icons",
  component: Icons,
};
