# JSON Schema Builder

A browser-based developer tool for converting sample JSON data into
a generated JSON Schema using recursion, data analysis, and object traversal.

## Live Links

- GitHub Repository: [fazal305/json-schema-builder](https://github.com/fazal305/json-schema-builder)
- Live Demo: [https://fazal305.github.io/json-schema-builder/](https://fazal305.github.io/json-schema-builder/)

## Overview

JSON Schema Builder helps developers turn real sample JSON into a structured JSON Schema directly in the browser. It supports pasted JSON, local `.json` file imports, recursive object traversal, array analysis, nullable value detection, schema preview, field analysis, and export tools.

The project is designed as a lightweight portfolio developer tool with no build process, no framework dependency, and a polished Bootstrap-powered interface.

## Features

- Paste sample JSON into a browser editor
- Import local `.json` files with the FileReader API
- Validate JSON with clear error messages
- Generate JSON Schema from objects, arrays, primitives, and null values
- Detect strings, numbers, integers, booleans, objects, arrays, and null
- Recursively analyze nested objects and nested arrays
- Detect required fields
- Support strict array item detection
- Merge mixed array item schemas with `oneOf`
- Include optional examples in generated schemas
- Include optional description placeholders
- Detect nullable values
- Pretty-print generated schema output
- Copy generated schema to the clipboard
- Download generated schema as `schema.json`
- Copy input JSON to the clipboard
- Load realistic sample JSON
- Search and filter field analysis rows
- Display stats for root type, total fields, nested objects, arrays, max depth, and schema size
- Responsive cyberpunk developer-tool interface

## Technologies Used

- HTML5
- CSS3
- Bootstrap 5
- jQuery
- Vanilla JavaScript
- JSON.parse
- JSON.stringify
- Recursive Object Traversal
- FileReader API
- Blob API
- Clipboard API

## Learning Outcomes

- Practiced recursive traversal of JSON objects and arrays
- Built schema generation logic from sample data
- Handled invalid JSON with `JSON.parse()` error feedback
- Used browser APIs for file import, clipboard copy, and file download
- Designed a responsive developer tool interface with Bootstrap and custom CSS
- Created field analysis and stats from structured data
- Managed client-side app state without a framework
- Implemented safe table rendering with escaped HTML output

## Folder Structure

```text
json-schema-builder/
  index.html
  styles.css
  script.js
  README.md
  LICENSE
  .gitignore
```
How To Run Locally
git clone https://github.com/fazal305/json-schema-builder.git
cd json-schema-builder
start index.html
You can also open index.html directly in any modern browser.
How To Use
Open index.html in your browser.
Paste valid JSON into the input editor, or import a .json file.
Choose schema options such as required fields, examples, descriptions, nullable detection, and strict array item detection.
Click Generate Schema.
Review the pretty-printed schema preview.
Inspect discovered fields in the field analysis table.
Search field paths, types, required values, or examples.
Copy or download the generated schema.
Use Clear to reset the workspace.
Sample Input and Output
Sample input:
{
  "name": "Ali",
  "age": 20
}
Generated schema output:
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "examples": [
        "Ali"
      ]
    },
    "age": {
      "type": "integer",
      "examples": [
        20
      ]
    }
  },
  "required": [
    "name",
    "age"
  ],
  "examples": [
    {
      "name": "Ali",
      "age": 20
    }
  ]
}