## Features and edit guide

This app visualizes a JSON Schema as a hierarchical tree of cubes (treeCubes) and lets you map supplier Excel fields (fieldCubes) to schema leaves, save/export a mapping workbook, and re-import mappings. Below is a feature inventory with where and how to change each behavior.

### Architecture at a glance
- **Entry**: `src/main.tsx` mounts `src/App.tsx` and loads `src/index.css`.
- **Core UI**: `src/App.tsx` orchestrates state, schema selection, search, zoom/pan, required panel, toasts, and the mapping modal.
- **Tree**: `src/components/TreeView.tsx` + `src/components/TreeNode.tsx` render treeCubes and description panels.
- **Connectors**: `src/components/DynamicConnectors.tsx` draws dashed connectors between parent/children.
- **Excel extractor**: `src/components/ExcelExtractor.tsx` shows fieldCubes, upload/download/template, mapping-import/export, inline editing, and context menu color.
- **Parsing**: `src/utils/parser.ts` converts JSON Schema to `TreeNodeData` with required/conditional/optional and rules.
- **Styles**: `src/index.css` contains design tokens and all component styles.

### Data model
- **Tree nodes**: `TreeNodeData` in `src/utils/parser.ts` (id, name, type, description, rules, requiredState, children, excelMeta).
- **Mappings (in-memory)**: `savedMappings` in `src/App.tsx` is an array of `{ targetNode, field, mappingDetails, outputs, timestamp }`.

### Feature: Schema selection and visualization
- **User flow**: Pick a schema from the dropdown, click "ויזואליזציה" to build the tree; required nodes tinted red, conditional tinted orange, mapped nodes green.
- **Where**: `src/App.tsx`
  - Schema list: `availableSchemas` object.
  - Visualize handler: `onVisualize()`.
  - Schema dropdown state: `selectedSchema`, `isSchemaDropdownOpen`.
- **How to edit/add**:
  - Add a new schema: append to `availableSchemas` in `src/App.tsx` with a valid JSON Schema object. Use `title` for root label.
  - Change required/conditional logic presentation: adjust `tileStyle` in `src/components/TreeNode.tsx` and CSS selectors `data-required` in `src/index.css`.

### Feature: Tree rendering (treeCubes)
- **User flow**: Expand/collapse nodes, open a leaf to view description and rules; cubes scale by depth; required/conditional/mapped styles apply.
- **Where**: `src/components/TreeNode.tsx`, `src/components/TreeView.tsx`, styles in `src/index.css`.
- **How to edit/add**:
  - Change cube visuals: tweak `.node-tile` and related `[data-*]` rules in `src/index.css`.
  - Change expand/collapse logic or preferred side: see `childrenOpen` state and `determinePreferredSide()` in `TreeNode.tsx`.
  - Change description/rules rendering: edit the `desc-panel` block in `TreeNode.tsx` and its styles under `.desc-*` in `index.css`.

### Feature: Dynamic connectors
- **User flow**: Dashed lines connect parent to children and reposition smoothly during expand/collapse and zoom.
- **Where**: `src/components/DynamicConnectors.tsx`.
- **How to edit/add**:
  - Change line style/colors: edit `renderConnectorLines()` stroke and `strokeDasharray`.
  - Adjust collision/visibility basis: modify how `nodePositions` are collected in `updateNodePositions()`.

### Feature: Excel extractor (fieldCubes)
- **User flow**: Upload a template of supplier fields, see fieldCubes, inline-edit their attributes, drag a fieldCube onto a tree leaf to map, export/import mappings.
- **Where**: `src/components/ExcelExtractor.tsx`.
- **How to edit/add**:
  - Change template columns or styling: `onDownloadTemplate()` and `generateMappingWorkbook()` control headers and column widths.
  - Parse uploaded filled template: `onUploadFilled()` (columns order and mapping to state).
  - Import existing mappings workbook: `onUploadMappingFile()` (header detection and mapping extraction).
  - Change fieldCube visuals and inline edit UX: the JSX under `.excel-cube` and handlers `editingField`, `handleSaveFieldValue()`; styles under `.excel-*` in `src/index.css`.
  - Context menu color chooser: `handleCubeRightClick()`, `handleColorChange()`, and the context menu JSX at the bottom of `ExcelExtractor.tsx`.

### Feature: Drag-and-drop mapping (Excel → Tree)
- **User flow**: Drag a fieldCube onto a schema leaf (treeCube with ⓘ). A mapping modal opens to add parser details and optional outputs. Saving marks the node as mapped.
- **Where**:
  - Drop target: `onDrop` in `src/components/TreeNode.tsx` (fires `excel:drop-on-node`).
  - Mapping modal and save flow: `src/App.tsx` state `mappingData` and the "Save Mapping" handler.
  - Apply mappings to tree: `applyMappingsToTree()` in `src/App.tsx`.
- **How to edit/add**:
  - Disallow/allow drop behaviors: edit `isExcelFieldDrag()` and `onDrop` in `TreeNode.tsx`.
  - Change fields captured in a mapping: adjust the modal inputs in `src/App.tsx` (Right/Middle/Left and outputs), and also the upsert logic where `savedMappings` is built and `excelRow` for export is composed.
  - Change how mappings tag a tree node: update `applyMappingsToTree()` and the matching strategy (path vs name+type).

### Feature: Mapping export/import (Excel)
- **User flow**: Export a mapping workbook that includes the selected schema key; import a mapping workbook to restore mappings and set the schema.
- **Where**: `src/components/ExcelExtractor.tsx`
  - Export mapping: `onDownloadMapping()` + `generateMappingWorkbook()`.
  - Import mapping: `onUploadMappingFile()`; dispatches `excel:mappings-imported` and optionally `excel:apply-selected-schema`.
- **How to edit/add**:
  - Add/remove columns: change the `headers` array and how each row is assembled in generation and parse the same in import.
  - Ensure round-trip of schema key: meta sheet logic in `generateMappingWorkbook()` (`__meta` sheet) and read in `onUploadMappingFile()`.

### Feature: Required fields panel
- **User flow**: Floating panel lists unmapped required tree leaves; collapsed/expandable.
- **Where**: `src/App.tsx` (calculations in `unmappedMandatoryLeaves`, `unmappedRequiredLeaves`; rendering block near the bottom). Styles in `src/index.css` under `.required-*`.
- **How to edit/add**:
  - Change listing/filtering: modify the `walk()` logic in the `useMemo` computing `unmappedMandatoryLeaves`.
  - Change visuals: edit `.required-panel` styles.

### Feature: Search overlay (Ctrl+F)
- **User flow**: Press Ctrl+F to open overlay; type to filter paths; click a result to expand ancestors, scroll into view, and highlight.
- **Where**: `src/App.tsx` search state, `flattenTree()`, `revealNodeById()`.
- **How to edit/add**:
  - Change hotkeys: `useEffect` handling `keydown` inside `App.tsx`.
  - Modify highlight behavior: the `highlightText()` effect and `.search-highlight` styles in `src/index.css`.
  - Change reveal/expansion behavior: `revealNodeById()` in `src/App.tsx` and `TreeNode.tsx` `handleLayoutUpdate`/`determinePreferredSide()`.

### Feature: Zoom and pan
- **User flow**: Mouse wheel zoom with focus under cursor; drag the canvas to pan. Also supports zoom while dragging a fieldCube.
- **Where**: `src/App.tsx`: `zoom`, `pan`, `onWheelZoom`, related refs and wheel listeners.
- **How to edit/add**:
  - Clamp or change zoom speed: `clampZoom()` and delta logic in `onWheelZoom`.
  - Pan behavior: `onMouseDown/Move/Up/Leave` on the `.full-viz` wrapper.

### Feature: Toaster/status messages
- **User flow**: Unified toaster at bottom-center shows OK/WARN/ERROR messages, driven by custom events.
- **Where**: `src/App.tsx` `excel:status` listener; styles `.toast-bottom` in `src/index.css`.
- **How to edit/add**:
  - Dispatch messages from anywhere: `window.dispatchEvent(new CustomEvent('excel:status', { detail: { message, type: 'ok'|'warn'|'error', durationMs } }))`.
  - Change look/position: edit `.toast-bottom` styles.

### Feature: Event bridge (App ↔ ExcelExtractor)
- **Events** (emit/handle) used across the app:
  - `excel:uploaded`, `excel:download-template-request`, `excel:download-mapping-request`, `excel:upload-request`, `excel:upload-mapping-request`, `excel:save-mapping-request`.
  - `excel:request-mappings`, `excel:request-selected-schema`, `excel:apply-selected-schema`, `excel:mappings-imported`, `excel:clear-all-mappings`.
  - `excel:drop-on-node`, `excel:mapping-saved`, `excel:status`.
- **Where**: Emitted/handled in `src/App.tsx`, `src/components/ExcelExtractor.tsx`, and `src/components/TreeNode.tsx`.
- **How to edit/add**:
  - Add a new cross-component action: define a new `excel:*` event name, add `window.addEventListener` where needed, and `dispatchEvent` at the emitter.

### Feature: Rules and validation display
- **User flow**: Opening a leaf (treeCube) shows description; if regex/validation exists, it appears under "Rules:".
- **Where**: Rule extraction in `src/utils/parser.ts` (`extractRules`), rendering in the `desc-panel` in `TreeNode.tsx`.
- **How to edit/add**:
  - Support more JSON Schema keywords: extend `extractRules()`.
  - Change formatting: edit the `desc-preview` section in `TreeNode.tsx` and `.desc-preview` styles.

### Theming and design
- **Where**: CSS design tokens under `:root` in `src/index.css` (`--bg`, `--panel`, `--text`, `--accent`, etc.).
- **How to edit/add**: Adjust variables and component rules. Tree/Excel cubes have distinct classes: `.node-*` for treeCubes, `.excel-*` for fieldCubes.

### Error handling and graceful failures
- All file operations and mapping steps use try/catch and surface errors via `excel:status` toasts and `console.error`, per the guideline to avoid fake data and fail visibly.
- Places to review when tightening error paths: uploads/imports/exports in `ExcelExtractor.tsx`, visualize/parse in `App.tsx` (`onVisualize`, JSON parse), and parser in `src/utils/parser.ts`.

### Common edits by task
- **Add a schema**: Add to `availableSchemas` in `src/App.tsx`. Click visualize.
- **Adjust required/conditional tinting**: `tileStyle` in `src/components/TreeNode.tsx` and CSS `[data-required]` rules.
- **Change mapping workbook columns**: `generateMappingWorkbook()` and `onUploadMappingFile()` in `src/components/ExcelExtractor.tsx`.
- **Add new mapping fields in the modal**: edit mapping modal JSX and `Save Mapping` handler in `src/App.tsx`, then reflect in workbook generation/import.
- **Change drag acceptance**: `isExcelFieldDrag()` and `onDrop` in `src/components/TreeNode.tsx`.
- **Change connector look**: `renderConnectorLines()` in `src/components/DynamicConnectors.tsx`.
- **Change search behavior**: search `useEffect`s and `revealNodeById()` in `src/App.tsx`.

### Build and run
- `npm run dev` — start Vite dev server
- `npm run build` — typecheck + build
- `npm run preview` — preview production build

### Glossary
- **treeCube**: a node in the JSON Schema tree (shown in the hierarchy tree).
- **fieldCube**: a field extracted from the uploaded Excel (shown in the Excel extractor).


