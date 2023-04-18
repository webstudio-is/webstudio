```json
{
  "type": "Box",
  "props": {
    "css": {
      "display": "flex",
      "flexDirection": ["column", "column", "row"],
      "gap": "32px",
      "alignItems": "flex-start"
    }
  },
  "children": [
    {
      "type": "Box",
      "props": {
        "css": {
          "flex": "1",
          "maxWidth": ["100%", "100%", "50%"]
        }
      },
      "children": [
        {
          "type": "Text",
          "props": {
            "css": {
              "fontSize": "32px",
              "fontWeight": "bold"
            }
          },
          "children": "Welcome to Webstudio"
        }
      ]
    },
    {
      "type": "Box",
      "props": {
        "css": {
          "flex": "1",
          "maxWidth": ["100%", "100%", "50%"]
        }
      },
      "children": [
        {
          "type": "Text",
          "props": {
            "css": {
              "fontSize": "24px"
            }
          },
          "children": "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
        }
      ]
    }
  ]
}
```
