const jsonInput = document.querySelector("#jsonInput");
const jsonFileInput = document.querySelector("#jsonFileInput");
const generateBtn = document.querySelector("#generateBtn");
const sampleBtn = document.querySelector("#sampleBtn");
const formatBtn = document.querySelector("#formatBtn");
const copyInputBtn = document.querySelector("#copyInputBtn");
const clearBtn = document.querySelector("#clearBtn");
const copySchemaBtn = document.querySelector("#copySchemaBtn");
const copySchemaExportBtn = document.querySelector("#copySchemaExportBtn");
const downloadSchemaBtn = document.querySelector("#downloadSchemaBtn");
const downloadSchemaExportBtn = document.querySelector("#downloadSchemaExportBtn");
const includeRequired = document.querySelector("#includeRequired");
const includeExamples = document.querySelector("#includeExamples");
const includeDescriptions = document.querySelector("#includeDescriptions");
const detectNullable = document.querySelector("#detectNullable");
const strictArrayItems = document.querySelector("#strictArrayItems");
const statusMessage = document.querySelector("#statusMessage");
const rootTypeStat = document.querySelector("#rootTypeStat");
const totalFieldsStat = document.querySelector("#totalFieldsStat");
const nestedObjectsStat = document.querySelector("#nestedObjectsStat");
const arraysFoundStat = document.querySelector("#arraysFoundStat");
const maxDepthStat = document.querySelector("#maxDepthStat");
const schemaSizeStat = document.querySelector("#schemaSizeStat");
const schemaPreview = document.querySelector("#schemaPreview");
const fieldSearch = document.querySelector("#fieldSearch");
const fieldTableBody = document.querySelector("#fieldTableBody");

let rawJsonText = "";
let parsedJsonData = null;
let generatedSchema = null;
let fieldAnalysis = [];
let filteredFieldAnalysis = [];

let schemaOptions = {
    includeRequired: true,
    includeExamples: true,
    includeDescriptions: false,
    detectNullable: true,
    strictArrayItems: true
};

/**
 * Validates JSON text and returns parsed data or an error message.
 * @param {string} text - Raw JSON text.
 * @returns {{valid: boolean, data?: *, error?: string}}
 */
function parseJsonInput(text) {
    try {
        return {
            valid: true,
            data: JSON.parse(text)
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * Detects the JSON Schema compatible type for a value.
 * @param {*} value - Any JSON value.
 * @returns {string}
 */
function getJsonType(value) {
    if (value === null) {
        return "null";
    }

    if (Array.isArray(value)) {
        return "array";
    }

    if (typeof value === "number" && Number.isInteger(value)) {
        return "integer";
    }

    if (typeof value === "number") {
        return "number";
    }

    return typeof value;
}

/**
 * Recursively generates a JSON Schema object for any JSON value.
 * @param {*} value - JSON value to inspect.
 * @param {string} path - Dot path for metadata.
 * @returns {Object}
 */
function generateSchema(value, path) {
    const type = getJsonType(value);
    let schema = {};

    if (type === "object") {
        schema = generateObjectSchema(value, path);
    } else if (type === "array") {
        schema = generateArraySchema(value, path);
    } else if (type === "null") {
        schema = { type: "null" };
    } else {
        schema = { type };
    }

    return addSchemaMetadata(schema, value, path);
}

/**
 * Creates a JSON Schema object definition from a plain object.
 * @param {Object} obj - Object to inspect.
 * @param {string} path - Current object path.
 * @returns {Object}
 */
function generateObjectSchema(obj, path) {
    const schema = {
        type: "object",
        properties: {}
    };

    const required = Object.keys(obj);

    Object.keys(obj).forEach((key) => {
        const childPath = path === "$" ? key : `${path}.${key}`;
        schema.properties[key] = generateSchema(obj[key], childPath);
    });

    if (schemaOptions.includeRequired && required.length > 0) {
        schema.required = required;
    }

    return schema;
}

/**
 * Creates a JSON Schema array definition from detected item schemas.
 * @param {Array} array - Array to inspect.
 * @param {string} path - Current array path.
 * @returns {Object}
 */
function generateArraySchema(array, path) {
    const schema = {
        type: "array"
    };

    if (array.length === 0) {
        schema.items = {};
        return schema;
    }

    if (!schemaOptions.strictArrayItems) {
        schema.items = generateSchema(array[0], `${path}[0]`);
        return schema;
    }

    const itemSchemas = array.map((item, index) => generateSchema(item, `${path}[${index}]`));
    schema.items = mergeSchemas(itemSchemas);

    return schema;
}

/**
 * Combines multiple schemas and uses oneOf when mixed types are detected.
 * @param {Array<Object>} schemas - Schemas to merge.
 * @returns {Object}
 */
function mergeSchemas(schemas) {
    const groups = new Map();

    schemas.forEach((schema) => {
        const key = Array.isArray(schema.type) ? schema.type.join("|") : schema.type || "oneOf";
        const existing = groups.get(key);

        if (!existing) {
            groups.set(key, schema);
            return;
        }

        if (schema.type === "object" && existing.type === "object") {
            groups.set(key, mergeObjectSchemas(existing, schema));
            return;
        }

        if (schema.type === "array" && existing.type === "array") {
            groups.set(key, {
                type: "array",
                items: mergeSchemas([existing.items || {}, schema.items || {}])
            });
        }
    });

    const mergedSchemas = [...groups.values()];

    if (mergedSchemas.length === 1) {
        return mergedSchemas[0];
    }

    return {
        oneOf: mergedSchemas
    };
}

/**
 * Merges two object schemas into one wider object schema.
 * @param {Object} firstSchema - First object schema.
 * @param {Object} secondSchema - Second object schema.
 * @returns {Object}
 */
function mergeObjectSchemas(firstSchema, secondSchema) {
    const merged = {
        type: "object",
        properties: {
            ...(firstSchema.properties || {})
        }
    };

    Object.entries(secondSchema.properties || {}).forEach(([key, schema]) => {
        if (merged.properties[key]) {
            merged.properties[key] = mergeSchemas([merged.properties[key], schema]);
        } else {
            merged.properties[key] = schema;
        }
    });

    if (schemaOptions.includeRequired) {
        const firstRequired = firstSchema.required || [];
        const secondRequired = secondSchema.required || [];
        const sharedRequired = firstRequired.filter((key) => secondRequired.includes(key));

        if (sharedRequired.length > 0) {
            merged.required = sharedRequired;
        }
    }

    return merged;
}

/**
 * Adds optional example, description, and nullable metadata.
 * @param {Object} schema - Schema to enrich.
 * @param {*} value - Source value.
 * @param {string} path - Current value path.
 * @returns {Object}
 */
function addSchemaMetadata(schema, value, path) {
    if (schemaOptions.detectNullable && value === null) {
        schema.type = ["null"];
    }

    if (schemaOptions.includeExamples && value !== undefined) {
        schema.examples = [value];
    }

    if (schemaOptions.includeDescriptions) {
        schema.description = path === "$" ? "Schema for the root JSON value." : `Schema for ${path}.`;
    }

    return schema;
}

/**
 * Recursively creates table rows for discovered fields.
 * @param {*} value - JSON value to inspect.
 * @param {string} path - Current field path.
 * @param {number} depth - Current nesting depth.
 * @param {boolean} required - Whether the field is required.
 * @returns {Array<Object>}
 */
function analyzeFields(value, path, depth, required) {
    const rows = [];
    const type = getJsonType(value);

    rows.push({
        path,
        type,
        required,
        example: formatValue(value),
        depth
    });

    if (type === "object") {
        Object.keys(value).forEach((key) => {
            const childPath = path === "$" ? key : `${path}.${key}`;
            rows.push(...analyzeFields(value[key], childPath, depth + 1, true));
        });
    }

    if (type === "array") {
        value.forEach((item, index) => {
            rows.push(...analyzeFields(item, `${path}[${index}]`, depth + 1, true));
        });
    }

    return rows;
}

/**
 * Pretty-prints generated schema in the preview panel.
 * @param {Object|null} schema - Schema to render.
 * @returns {void}
 */
function renderSchemaPreview(schema) {
    schemaPreview.textContent = schema
        ? JSON.stringify(schema, null, 2)
        : "Generate a schema to preview JSON Schema output here.";
}

/**
 * Renders the field analysis rows in the table.
 * @param {Array<Object>} rows - Rows to display.
 * @returns {void}
 */
function renderFieldAnalysis(rows) {
    if (rows.length === 0) {
        fieldTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">Generate a schema to inspect discovered fields.</div>
        </td>
      </tr>
    `;
        return;
    }

    fieldTableBody.innerHTML = rows.map((row) => `
    <tr>
      <td class="path-cell">${escapeHtml(row.path)}</td>
      <td class="type-cell"><span class="badge badge-soft">${escapeHtml(row.type)}</span></td>
      <td>
        <span class="badge ${row.required ? "badge-required" : "badge-optional"}">
          ${row.required ? "Yes" : "No"}
        </span>
      </td>
      <td class="example-cell">${escapeHtml(row.example)}</td>
      <td>${row.depth}</td>
    </tr>
  `).join("");
}

/**
 * Renders root type, field counts, depth, array count, and schema size.
 * @param {*} data - Parsed JSON data.
 * @param {Object|null} schema - Generated schema.
 * @param {Array<Object>} rows - Field analysis rows.
 * @returns {void}
 */
function renderStats(data, schema, rows) {
    const nestedObjects = rows.filter((row) => row.type === "object" && row.depth > 0).length;
    const arraysFound = rows.filter((row) => row.type === "array").length;
    const maxDepth = rows.reduce((max, row) => Math.max(max, row.depth), 0);
    const schemaText = schema ? JSON.stringify(schema, null, 2) : "";

    rootTypeStat.textContent = data === null ? "-" : getJsonType(data);
    totalFieldsStat.textContent = rows.length.toString();
    nestedObjectsStat.textContent = nestedObjects.toString();
    arraysFoundStat.textContent = arraysFound.toString();
    maxDepthStat.textContent = maxDepth.toString();
    schemaSizeStat.textContent = formatBytes(new Blob([schemaText]).size);
}

/**
 * Filters field analysis by path, type, required status, or example value.
 * @param {string} term - Search term.
 * @returns {void}
 */
function filterFieldAnalysis(term) {
    const normalizedTerm = term.trim().toLowerCase();

    filteredFieldAnalysis = normalizedTerm
        ? fieldAnalysis.filter((row) => {
            const requiredText = row.required ? "required yes" : "optional no";

            return row.path.toLowerCase().includes(normalizedTerm)
                || row.type.toLowerCase().includes(normalizedTerm)
                || row.example.toLowerCase().includes(normalizedTerm)
                || requiredText.includes(normalizedTerm);
        })
        : [...fieldAnalysis];

    renderFieldAnalysis(filteredFieldAnalysis);
}

/**
 * Reads input, validates JSON, generates schema, renders analysis, and updates status.
 * @returns {void}
 */
function handleGenerateSchema() {
    setLoading(true);
    rawJsonText = jsonInput.value.trim();

    if (!rawJsonText) {
        showStatus("Please paste JSON input before generating a schema.", "error");
        setLoading(false);
        return;
    }

    const result = parseJsonInput(rawJsonText);

    if (!result.valid) {
        showStatus(`Invalid JSON: ${result.error}`, "error");
        setLoading(false);
        return;
    }

    syncSchemaOptions();

    parsedJsonData = result.data;
    generatedSchema = generateSchema(parsedJsonData, "$");
    fieldAnalysis = analyzeFields(parsedJsonData, "$", 0, true);
    filteredFieldAnalysis = [...fieldAnalysis];

    renderSchemaPreview(generatedSchema);
    renderFieldAnalysis(filteredFieldAnalysis);
    renderStats(parsedJsonData, generatedSchema, fieldAnalysis);
    showStatus("Schema generated successfully.", "success");
    setLoading(false);
}

/**
 * Reads an imported .json file and generates a schema from its contents.
 * @param {Event} event - File input event.
 * @returns {void}
 */
function handleFileImport(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    if (!file.name.toLowerCase().endsWith(".json")) {
        showStatus("Please import a .json file.", "error");
        jsonFileInput.value = "";
        return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", () => {
        jsonInput.value = String(reader.result);
        showStatus(`Imported ${file.name}. Generating schema...`, "info");
        handleGenerateSchema();
    });

    reader.addEventListener("error", () => {
        showStatus("Unable to read the selected file.", "error");
    });

    reader.readAsText(file);
}

/**
 * Pretty-prints valid JSON inside the textarea.
 * @returns {void}
 */
function formatInputJson() {
    const text = jsonInput.value.trim();

    if (!text) {
        showStatus("Paste JSON before formatting.", "error");
        return;
    }

    const result = parseJsonInput(text);

    if (!result.valid) {
        showStatus(`Cannot format invalid JSON: ${result.error}`, "error");
        return;
    }

    jsonInput.value = JSON.stringify(result.data, null, 2);
    showStatus("Input JSON formatted.", "success");
}

/**
 * Loads realistic nested sample JSON into the textarea.
 * @returns {void}
 */
function loadSampleJson() {
    const sampleData = {
        user: {
            id: 101,
            name: "Ali Khan",
            email: "ali@example.com",
            age: 20,
            isActive: true,
            phone: null,
            profile: {
                city: "Karachi",
                country: "Pakistan",
                verified: false
            }
        },
        orders: [
            {
                id: 5001,
                status: "pending",
                total: 2500,
                items: [
                    {
                        name: "Wireless Mouse",
                        quantity: 1,
                        price: 1800
                    }
                ]
            },
            {
                id: 5002,
                status: "delivered",
                total: 4100,
                items: [
                    {
                        name: "Keyboard",
                        quantity: 1,
                        price: 4100
                    }
                ]
            }
        ],
        settings: {
            newsletter: true,
            theme: "dark",
            language: "en"
        },
        tags: ["developer", "json", "schema"],
        audit: [
            ["created", "2026-07-05"],
            ["updated", null]
        ]
    };

    jsonInput.value = JSON.stringify(sampleData, null, 2);
    showStatus("Sample JSON loaded.", "info");
}

/**
 * Copies the generated schema to the clipboard.
 * @returns {void}
 */
function copySchema() {
    if (!generatedSchema) {
        showStatus("Generate a schema before copying.", "error");
        return;
    }

    navigator.clipboard.writeText(JSON.stringify(generatedSchema, null, 2))
        .then(() => showStatus("Generated schema copied to clipboard.", "success"))
        .catch(() => showStatus("Clipboard copy failed.", "error"));
}

/**
 * Copies the current input JSON to the clipboard.
 * @returns {void}
 */
function copyInputJson() {
    const text = jsonInput.value.trim();

    if (!text) {
        showStatus("There is no input JSON to copy.", "error");
        return;
    }

    navigator.clipboard.writeText(text)
        .then(() => showStatus("Input JSON copied to clipboard.", "success"))
        .catch(() => showStatus("Clipboard copy failed.", "error"));
}

/**
 * Downloads the generated schema as schema.json.
 * @returns {void}
 */
function downloadSchemaJson() {
    if (!generatedSchema) {
        showStatus("Generate a schema before downloading.", "error");
        return;
    }

    const schemaText = JSON.stringify(generatedSchema, null, 2);
    const blob = new Blob([schemaText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = url;
    downloadLink.download = "schema.json";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    URL.revokeObjectURL(url);
    showStatus("schema.json download started.", "success");
}

/**
 * Clears all app state, form fields, preview content, table rows, and stats.
 * @returns {void}
 */
function handleClear() {
    rawJsonText = "";
    parsedJsonData = null;
    generatedSchema = null;
    fieldAnalysis = [];
    filteredFieldAnalysis = [];

    jsonInput.value = "";
    jsonFileInput.value = "";
    fieldSearch.value = "";

    renderSchemaPreview(null);
    renderFieldAnalysis([]);
    renderStats(null, null, []);
    showStatus("Cleared input, output, stats, and file selection.", "info");
}

/**
 * Converts JSON values into readable table strings.
 * @param {*} value - Value to format.
 * @returns {string}
 */
function formatValue(value) {
    const type = getJsonType(value);

    if (type === "null") {
        return "null";
    }

    if (type === "object" || type === "array") {
        const text = JSON.stringify(value);
        return text.length > 120 ? `${text.slice(0, 117)}...` : text;
    }

    if (type === "string") {
        return `"${value}"`;
    }

    return String(value);
}

/**
 * Converts byte counts into readable file size strings.
 * @param {number} bytes - Number of bytes.
 * @returns {string}
 */
function formatBytes(bytes) {
    if (bytes === 0) {
        return "0 B";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Escapes strings before inserting them through innerHTML.
 * @param {string} str - Raw string.
 * @returns {string}
 */
function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * Displays a status message with success, error, or info styling.
 * @param {string} message - Message to display.
 * @param {string} type - Message type.
 * @returns {void}
 */
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message";

    if (type === "success") {
        statusMessage.classList.add("status-success");
    }

    if (type === "error") {
        statusMessage.classList.add("status-error");
    }

    if (type === "info") {
        statusMessage.classList.add("status-info");
    }
}

/**
 * Disables or enables the generate button while processing.
 * @param {boolean} isLoading - Loading state.
 * @returns {void}
 */
function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    generateBtn.textContent = isLoading ? "Generating..." : "Generate Schema";
}

/**
 * Synchronizes checkbox values into schema option state.
 * @returns {void}
 */
function syncSchemaOptions() {
    schemaOptions = {
        includeRequired: includeRequired.checked,
        includeExamples: includeExamples.checked,
        includeDescriptions: includeDescriptions.checked,
        detectNullable: detectNullable.checked,
        strictArrayItems: strictArrayItems.checked
    };
}

/**
 * Regenerates the schema when options change and input exists.
 * @returns {void}
 */
function handleOptionChange() {
    syncSchemaOptions();

    if (jsonInput.value.trim()) {
        handleGenerateSchema();
    }
}

generateBtn.addEventListener("click", handleGenerateSchema);
sampleBtn.addEventListener("click", loadSampleJson);
formatBtn.addEventListener("click", formatInputJson);
copyInputBtn.addEventListener("click", copyInputJson);
clearBtn.addEventListener("click", handleClear);
copySchemaBtn.addEventListener("click", copySchema);
copySchemaExportBtn.addEventListener("click", copySchema);
downloadSchemaBtn.addEventListener("click", downloadSchemaJson);
downloadSchemaExportBtn.addEventListener("click", downloadSchemaJson);
jsonFileInput.addEventListener("change", handleFileImport);
fieldSearch.addEventListener("input", (event) => filterFieldAnalysis(event.target.value));

[
    includeRequired,
    includeExamples,
    includeDescriptions,
    detectNullable,
    strictArrayItems
].forEach((checkbox) => {
    checkbox.addEventListener("change", handleOptionChange);
});

showStatus("Ready for JSON input.", "info");
renderSchemaPreview(null);
renderFieldAnalysis([]);
renderStats(null, null, []);