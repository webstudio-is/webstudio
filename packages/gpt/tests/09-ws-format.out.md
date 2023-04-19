```json
{
  "instances": [
    {
      "type": "instance",
      "id": "id-Box-1",
      "component": "Box",
      "children": [
        {
          "type": "text",
          "value": "sidebar"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Box-2",
      "component": "Box",
      "children": [
        {
          "type": "text",
          "value": "main content"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Box-3",
      "component": "Box",
      "children": [
        {
          "type": "id",
          "value": "id-Box-1"
        },
        {
          "type": "id",
          "value": "id-Box-2"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Body-1",
      "component": "Body",
      "children": [
        {
          "type": "id",
          "value": "id-Box-3"
        }
      ]
    }
  ],
  "styleSourceSelections": [],
  "styleSources": [],
  "styles": [
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "display",
      "value": {
        "type": "keyword",
        "value": "flex"
      }
    },
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "flex-direction",
      "value": {
        "type": "keyword",
        "value": "row"
      }
    },
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "height",
      "value": {
        "type": "unit",
        "unit": "100vh",
        "value": 1
      }
    },
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "width",
      "value": {
        "type": "unit",
        "unit": "100vw",
        "value": 1
      }
    },
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "box-sizing",
      "value": {
        "type": "keyword",
        "value": "border-box"
      }
    },
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "padding",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 20
      }
    },
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "font-size",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 16
      }
    },
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "font-weight",
      "value": {
        "type": "keyword",
        "value": "bold"
      }
    },
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "align-items",
      "value": {
        "type": "keyword",
        "value": "flex-start"
      }
    },
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "justify-content",
      "value": {
        "type": "keyword",
        "value": "flex-start"
      }
    },
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "border",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 1
      }
    },
    {
      "styleSourceId": "",
      "breakpointId": "",
      "state": "",
      "property": "border-color",
      "value": {
        "type": "rgb",
        "r": 0,
        "g": 0,
        "b": 0,
        "alpha": 1
      }
    }
  ]
}
```
