```json
{
  "instances": [
    {
      "type": "instance",
      "id": "id-Body-1",
      "component": "Body",
      "children": [
        {
          "type": "id",
          "value": "id-Box-2"
        },
        {
          "type": "id",
          "value": "id-Box-3"
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
          "value": "sidebar"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Box-3",
      "component": "Box",
      "children": [
        {
          "type": "text",
          "value": "main content"
        }
      ]
    }
  ],
  "styleSourceSelections": [
    {
      "instanceId": "id-Body-1",
      "values": ["id-StyleSource-1"]
    },
    {
      "instanceId": "id-Box-2",
      "values": ["id-StyleSource-2"]
    },
    {
      "instanceId": "id-Box-3",
      "values": ["id-StyleSource-2"]
    }
  ],
  "styleSources": [
    {
      "type": "token",
      "id": "id-StyleSource-1",
      "name": "default"
    },
    {
      "type": "token",
      "id": "id-StyleSource-2",
      "name": "default"
    }
  ],
  "styles": [
    {
      "styleSourceId": "id-StyleSource-1",
      "breakpointId": "id-breakpoint-1",
      "property": "display",
      "value": {
        "type": "keyword",
        "value": "flex"
      }
    },
    {
      "styleSourceId": "id-StyleSource-1",
      "breakpointId": "id-breakpoint-1",
      "property": "flex-direction",
      "value": {
        "type": "keyword",
        "value": "row"
      }
    },
    {
      "styleSourceId": "id-StyleSource-1",
      "breakpointId": "id-breakpoint-1",
      "property": "height",
      "value": {
        "type": "unit",
        "unit": "vh",
        "value": 100
      }
    },
    {
      "styleSourceId": "id-StyleSource-2",
      "breakpointId": "id-breakpoint-1",
      "property": "width",
      "value": {
        "type": "unit",
        "unit": "%",
        "value": 50
      }
    },
    {
      "styleSourceId": "id-StyleSource-2",
      "breakpointId": "id-breakpoint-1",
      "property": "background-color",
      "value": {
        "type": "rgb",
        "r": 255,
        "g": 255,
        "b": 255,
        "alpha": 1
      }
    },
    {
      "styleSourceId": "id-StyleSource-2",
      "breakpointId": "id-breakpoint-1",
      "property": "padding",
      "value": {
        "type": "unit",
        "unit": "px",
        "value": 16
      }
    },
    {
      "styleSourceId": "id-StyleSource-2",
      "breakpointId": "id-breakpoint-1",
      "property": "box-sizing",
      "value": {
        "type": "keyword",
        "value": "border-box"
      }
    },
    {
      "styleSourceId": "id-StyleSource-2",
      "breakpointId": "id-breakpoint-1",
      "property": "height",
      "value": {
        "type": "unit",
        "unit": "vh",
        "value": 100
      }
    },
    {
      "styleSourceId": "id-StyleSource-2",
      "breakpointId": "id-breakpoint-1",
      "property": "overflow",
      "value": {
        "type": "keyword",
        "value": "auto"
      }
    }
  ]
}
```
