```json
{
  "type": "Box",
  "props": {
    "css": {
      "display": "flex",
      "flexDirection": ["column", "column", "row"],
      "justifyContent": "space-between",
      "alignItems": ["center", "center", "stretch"],
      "padding": ["20px", "40px", "60px"]
    }
  },
  "children": [
    {
      "type": "Box",
      "props": {
        "css": {
          "width": ["100%", "100%", "50%"],
          "marginBottom": ["40px", "40px", "0"],
          "paddingRight": ["0", "0", "40px"]
        }
      },
      "children": [
        {
          "type": "Text",
          "props": {
            "text": "Left Column"
          }
        }
      ]
    },
    {
      "type": "Box",
      "props": {
        "css": {
          "width": ["100%", "100%", "50%"],
          "paddingLeft": ["0", "0", "40px"]
        }
      },
      "children": [
        {
          "type": "Text",
          "props": {
            "text": "Right Column"
          }
        }
      ]
    }
  ]
}
```
