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
          "value": "Hello, world!"
        }
      ]
    },
    {
      "type": "instance",
      "id": "id-Text-2",
      "component": "Text",
      "label": "Heading",
      "children": [
        {
          "type": "text",
          "value": "This is a heading"
        }
      ]
    }
  ],
  "styleSourceSelections": [
    {
      "instanceId": "id-Box-1",
      "values": ["style-source-1"]
    },
    {
      "instanceId": "id-Text-2",
      "values": ["style-source-2"]
    }
  ],
  "styleSources": [
    {
      "type": "token",
      "id": "style-source-1",
      "name": "Background color"
    },
    {
      "type": "token",
      "id": "style-source-2",
      "name": "Text color"
    }
  ],
  "styles": [
    {
      "styleSourceId": "style-source-1",
      "breakpointId": "sm",
      "state": "hover",
      "property": "backgroundColor",
      "value": {
        "type": "rgb",
        "r": 255,
        "g": 255,
        "b": 255,
        "alpha": 1
      }
    },
    {
      "styleSourceId": "style-source-2",
      "breakpointId": "sm",
      "state": null,
      "property": "color",
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
