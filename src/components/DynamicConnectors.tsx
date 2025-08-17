import { useEffect, useState, useRef } from 'react'

interface NodePosition {
  id: string
  parentId?: string
  x: number
  y: number
  width: number
  height: number
  isVisible: boolean
}

interface DynamicConnectorsProps {
  containerRef: React.RefObject<HTMLElement>
}

export function DynamicConnectors({ containerRef }: DynamicConnectorsProps) {
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map())
  const svgRef = useRef<SVGSVGElement>(null)
  const rafRef = useRef<number | null>(null)
  const smoothUntilRef = useRef<number>(0)

  const updateNodePositions = () => {
    if (!containerRef.current) return

    const newPositions = new Map<string, NodePosition>()
    const container = containerRef.current

    // Find all visible node tiles (exclude description panels with data-node-id "*-desc")
    const nodeTiles = container.querySelectorAll('.node-tile[data-node-id]') as NodeListOf<HTMLElement>
    
    nodeTiles.forEach(tile => {
      const nodeId = tile.getAttribute('data-node-id')
      if (!nodeId) return

      // Get position relative to the container (not viewport)
      const tileRect = tile.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      // Read current scale from container transform to convert viewport
      // (scaled) coordinates back into the container's local coordinate space.
      const computed = window.getComputedStyle(container)
      const t = computed.transform
      let scaleX = 1, scaleY = 1
      if (t && t !== 'none') {
        const m = t.match(/matrix\(([^)]+)\)/)
        if (m) {
          const [a, b, c, d] = m[1].split(',').map(v => parseFloat(v.trim()))
          // Robust against any rotation/shear; derive scales from matrix
          scaleX = Math.sqrt(a * a + b * b) || 1
          scaleY = Math.sqrt(c * c + d * d) || 1
        }
      }
      
      // Find parent by traversing up the DOM structure
      const treeNode = tile.closest('.tree-node') as HTMLElement
      const branchCell = treeNode?.closest('.branch-cell') as HTMLElement
      const branchRow = branchCell?.closest('.branch-row') as HTMLElement
      const binaryChildren = branchRow?.closest('.binary-children') as HTMLElement
      const parentTreeLi = binaryChildren?.closest('.tree-li') as HTMLElement
      const parentTile = parentTreeLi?.querySelector('.node-tile[data-node-id]') as HTMLElement
      const parentId = parentTile?.getAttribute('data-node-id')

      // Check if this node is visible (not in any collapsed ancestor branch)
      let isVisible = true
      let walker: HTMLElement | null = tile
      while (walker && walker !== container) {
        if (walker.classList && walker.classList.contains('binary-children')) {
          if (!walker.classList.contains('open')) { isVisible = false; break }
        }
        walker = walker.parentElement as HTMLElement | null
      }

      // Convert to the unscaled local coordinate space so that after the
      // parent's CSS transform is applied, nodes and lines align perfectly.
      const scaledX = (tileRect.left - containerRect.left) / scaleX + (tileRect.width / 2) / scaleX
      const scaledY = (tileRect.top - containerRect.top) / scaleY + (tileRect.height) / scaleY

      newPositions.set(nodeId, {
        id: nodeId,
        parentId: parentId ?? undefined,
        x: scaledX,
        y: scaledY,
        width: tileRect.width / scaleX,
        height: tileRect.height / scaleY,
        isVisible
      })
    })

    setNodePositions(newPositions)
  }

  useEffect(() => {
    const smoothUpdatePositions = (ms = 400) => {
      // Extend the smoothing window and start a rAF loop if not running
      const target = performance.now() + ms
      smoothUntilRef.current = Math.max(smoothUntilRef.current, target)
      if (rafRef.current == null) {
        const loop = () => {
          rafRef.current = null
          updateNodePositions()
          if (performance.now() < smoothUntilRef.current) {
            rafRef.current = requestAnimationFrame(loop)
          }
        }
        rafRef.current = requestAnimationFrame(loop)
      }
    }

    // Initial update
    updateNodePositions()
    smoothUpdatePositions(300)

    // Update on DOM changes
    const observer = new MutationObserver(() => smoothUpdatePositions(500))
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      })
    }

    // Update on resize
    const resizeObserver = new ResizeObserver(() => smoothUpdatePositions(200))
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    // Update on scroll/zoom of the wrapper (style transform changes)
    const handleUpdate = () => {
      smoothUpdatePositions(120)
    }
    window.addEventListener('scroll', handleUpdate)
    window.addEventListener('resize', handleUpdate)

      // Also respond to transitions/animations within the tree for smoother updates
    const transitionHandler = () => smoothUpdatePositions(400)
    const host = containerRef.current
    host?.addEventListener('transitionrun', transitionHandler, true)
    host?.addEventListener('transitionend', transitionHandler, true)
    host?.addEventListener('animationstart', transitionHandler, true)
    host?.addEventListener('animationend', transitionHandler, true)

    // Also watch style changes specifically on the wrapper element
    const styleObserver = new MutationObserver(() => smoothUpdatePositions(200))
    if (containerRef.current) {
      styleObserver.observe(containerRef.current, { attributes: true, attributeFilter: ['style'] })
    }

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      styleObserver.disconnect()
      window.removeEventListener('scroll', handleUpdate)
      window.removeEventListener('resize', handleUpdate)
      const h = host
      if (h) {
        h.removeEventListener('transitionrun', transitionHandler, true)
        h.removeEventListener('transitionend', transitionHandler, true)
        h.removeEventListener('animationstart', transitionHandler, true)
        h.removeEventListener('animationend', transitionHandler, true)
      }
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      smoothUntilRef.current = 0
    }
  }, [containerRef])

  const renderConnectorLines = () => {
    const segments: JSX.Element[] = []

    // Group visible children by parent id
    const childrenByParent = new Map<string, NodePosition[]>()
    nodePositions.forEach((node) => {
      if (!node.parentId || !node.isVisible) return
      const parent = nodePositions.get(node.parentId)
      if (!parent || !parent.isVisible) return
      if (
        Number.isNaN(parent.x) || Number.isNaN(parent.y) ||
        Number.isNaN(node.x) || Number.isNaN(node.y) || Number.isNaN(node.height) || Number.isNaN(node.width)
      ) {
        return
      }
      const arr = childrenByParent.get(node.parentId) ?? []
      arr.push(node)
      childrenByParent.set(node.parentId, arr)
    })

    // For each parent, draw a central vertical trunk and horizontal branches
    childrenByParent.forEach((children, parentId) => {
      const parent = nodePositions.get(parentId)
      if (!parent) return

      // Further group by row (children that share approximately the same vertical center)
      const rows = new Map<string, { y: number; items: NodePosition[] }>()
      children.forEach((child) => {
        const centerY = child.y - child.height / 2
        const key = String(Math.round(centerY))
        const existing = rows.get(key)
        if (existing) {
          existing.items.push(child)
          // Keep y as the running average to smooth tiny rounding diffs
          existing.y = (existing.y * (existing.items.length - 1) + centerY) / existing.items.length
        } else {
          rows.set(key, { y: centerY, items: [child] })
        }
      })

      // Sort rows by y and draw a single trunk from parent bottom to the lowest row
      const sortedRows = Array.from(rows.values()).sort((a, b) => a.y - b.y)
      if (sortedRows.length > 0) {
        const trunkX = parent.x
        const trunkTopY = parent.y
        const trunkBottomY = sortedRows[sortedRows.length - 1].y

        segments.push(
          <path
            key={`trunk-${parent.id}`}
            d={`M ${trunkX.toFixed(2)} ${trunkTopY.toFixed(2)} L ${trunkX.toFixed(2)} ${trunkBottomY.toFixed(2)}`}
            stroke="rgba(124,192,255,0.8)"
            strokeWidth={2}
            strokeDasharray="6 6"
            fill="none"
            strokeLinecap="butt"
            strokeLinejoin="round"
            data-orientation="trunk"
            data-parent-id={parent.id}
            data-x={trunkX.toFixed(2)}
            data-y1={trunkTopY.toFixed(2)}
            data-y2={trunkBottomY.toFixed(2)}
          />
        )

        // For each row, draw horizontal branches from trunk to child side midpoints
        sortedRows.forEach(({ y: rowY, items }) => {
          items.forEach((child) => {
            const childCenterX = child.x
            const isLeftOfTrunk = childCenterX < trunkX
            const sideX = isLeftOfTrunk
              ? childCenterX + child.width / 2
              : childCenterX - child.width / 2

            segments.push(
              <path
                key={`branch-${parent.id}-${child.id}`}
                d={`M ${trunkX.toFixed(2)} ${rowY.toFixed(2)} L ${sideX.toFixed(2)} ${rowY.toFixed(2)}`}
                stroke="rgba(124,192,255,0.8)"
                strokeWidth={2}
                strokeDasharray="6 6"
                fill="none"
                strokeLinecap="butt"
                strokeLinejoin="round"
                data-orientation="branch"
                data-y={rowY.toFixed(2)}
              />
            )
          })
        })
      }
    })

    return segments
  }

  if (!containerRef.current) return null

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100,
            overflow: 'visible'
      }}
      data-role="connectors"
    >
      {renderConnectorLines()}
    </svg>
  )
}
