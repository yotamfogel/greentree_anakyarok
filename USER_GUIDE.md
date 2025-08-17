## User guide: Features and workflows

This guide explains what you can do in the app and how to do it, step by step. It focuses on day-to-day usage, not code.

### What this app does
- **Visualize a standard (JSON Schema) as a tree**: Each field appears as a cube in a hierarchy.
- **Extract and view supplier fields from Excel**: Each row in your Excel becomes a cube you can work with.
- **Map supplier fields to standard fields**: Drag a field from the Excel panel onto a matching tree leaf and save mapping details.
- **Export and re-import a mapping workbook**: Save your mapping decisions to Excel; later, load them back and continue where you left off.
- **See what’s required**: A floating panel lists required standard fields you haven’t mapped yet.
- **Search, zoom, pan**: Quickly find fields, navigate large trees smoothly.

### Quick start
1) **Choose a standard**: Open the selector in the top bar, pick a schema.
2) **Visualize**: Click "ויזואליזציה" to see the tree of cubes.
3) **Upload Excel**: Use "העלאה" → upload your filled template. Field cubes will appear in the left panel for mapping.

## Features at a glance
- **Tree cubes (standard fields)**
  - Red: required; Orange: required only if the optional parent is used; Green: mapped.
  - Click a leaf to see its description and validation rules.
- **Excel cubes (supplier fields)**
  - Inline editing of attributes (double-click a value to edit).
  - Right‑click to change cube color (visual note only).
  - Drag a cube onto a tree leaf to map it.
- **Required fields panel**: Lists unmapped required leaves; click the panel header to collapse/expand.
- **Search**: Press Ctrl+F; click a result to reveal and focus the node.
- **Export mapping**: Downloads an Excel workbook with your mappings.
- **Import mapping**: Uploads a mapping workbook; mappings are restored and the schema is auto-selected if embedded.

## Core workflows

### 1) Visualize a schema
- Open the schema selector in the top bar and pick a schema (standard).
- Click "ויזואליזציה".
- The tree appears; required fields are tinted red, conditional are orange.

### 2) Prepare and upload a supplier Excel
- Click "הורדה" → "הורד פורמט פס" to download the template.
- Fill the template with your supplier fields and save it.
- Click "העלאה" → "העלה פס" to upload your filled template.
- The left panel (Excel extractor) will show your fields as cubes.

### 3) Map fields to the standard
- Drag an Excel cube and drop it on a tree leaf (cubes with ⓘ). Non-leaf targets are not accepted.
- A mapping window opens showing:
  - Standard field info (name, type, description, rules).
  - Parser details (your free‑text mapping logic).
  - Optional “outputs only” text (if the mapping should apply only to specific outputs).
- Click "Save Mapping". The tree node turns green; the Excel cube shows a checkmark.

### 4) Track required fields
- The floating panel on the right lists unmapped required standard fields.
- If you try to export mappings with required fields still unmapped, you’ll see a prompt. You can cancel or export anyway.

### 5) Export a mapping workbook
- Click "הורדה" → "הורד מאפינג".
- The downloaded Excel includes your mappings and the selected schema key for round‑trip import.

### 6) Import a mapping workbook
- Click "העלאה" → "העלה מאפינג" and choose a previously exported mapping file.
- Your mappings will be restored; if the file contains a schema key, the app will select and visualize it automatically.

### 7) Search and navigate the tree
- Press Ctrl+F to open search.
- Type to filter; click a result to automatically expand ancestors, scroll the node into view, and temporarily highlight it.

### 8) Zoom and pan
- Scroll to zoom in/out; the zoom centers around your cursor.
- Click‑drag the background to pan.
- You can also zoom while dragging an Excel cube.

### 9) Change Excel cube color (visual note)
- Right‑click an Excel cube to open the color menu.
- Pick a color (e.g., green, red, yellow) to visually tag a field. This doesn’t affect mapping logic.

### 10) Clear Excel and mappings
- When Excel cubes are present, a trash button appears in the lower-left.
- Click it to clear the Excel panel and remove all mappings from the tree.

## Tips and FAQs
- **I can’t drop on a cube. Why?** Only tree leaves accept drops (they show ⓘ). Expand to the leaf level first.
- **What do the colors mean?**
  - Tree cubes: Red = required; Orange = conditional (required if the optional parent is present); Green = mapped.
  - Excel cubes: Color is a visual tag only; a checkmark appears when a field is mapped.
- **Where do messages appear?** Success/warn/error messages pop up at the bottom center.
- **Can I export with missing required fields?** Yes; you’ll be warned and can proceed anyway.
- **How do I see a field’s rules?** Click a tree leaf to open its description; rules (e.g., pattern, min/max) are listed there if available.

## Keyboard shortcuts
- **Ctrl+F**: Open search.
- **Esc**: Close search, close menus, and exit certain dialogs.

## Troubleshooting
- If something fails (upload, import, export, visualize), the app shows an error message and logs details to the console so you can diagnose the issue.
- If your mapping workbook doesn’t restore the schema automatically, pick the schema manually and click "ויזואליזציה".

## Glossary
- **Standard field (tree cube)**: A field from the chosen JSON Schema shown in the hierarchy tree.
- **Supplier field (Excel cube)**: A field from your uploaded Excel template shown in the left panel.


