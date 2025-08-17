# Instructions for Adding Dynamic SVG Connector Lines in a JSON Visualization (React)

## 1. Overview
This guide explains how to connect parent and child nodes in a JSON visualization using **SVG lines** that automatically update when:
- Nodes expand/collapse
- The window resizes
- The layout changes

The approach:
1. Render nodes normally.
2. Track their screen positions with `ref`s.
3. Draw all connector lines in a single absolutely positioned `<svg>` overlay.
4. Update line coordinates whenever positions change.

---

## 2. Container Setup
- Wrap all nodes and the SVG overlay in a container with `position: relative`.
- The SVG should cover the entire container.

Example:
```jsx
<div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
  {renderedNodes}

  <svg
    ref={svgRef}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none'
    }}
  >
    {lines.map((line, idx) => (
      <line
        key={idx}
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        stroke="#ccc"
        strokeWidth="2"
        strokeDasharray="4"
      />
    ))}
  </svg>
</div>
