import { useMemo, useRef, useState, useEffect } from 'react'
import { TreeNodeData } from '../utils/parser'

interface TreeNodeProps {
  node: TreeNodeData
  depth: number
  isRoot?: boolean
  defaultOpenChildren?: boolean
  forcePreferredSide?: 'left' | 'right'
}

export function TreeNode({ node, depth, isRoot = false, defaultOpenChildren = false, forcePreferredSide }: TreeNodeProps) {
  const [childrenOpen, setChildrenOpen] = useState<boolean>(defaultOpenChildren || depth === 0)
  const [descOpen, setDescOpen] = useState<boolean>(false)
  const [preferredSide, setPreferredSide] = useState<'left' | 'right'>(forcePreferredSide ?? 'right')
  const [isDragOver, setIsDragOver] = useState<boolean>(false)
  const hoverExpandTimerRef = useRef<number | null>(null)
  const dragOverDepthRef = useRef<number>(0)

  const hasChildren = (node.children?.length ?? 0) > 0
  const indentStyle = { paddingLeft: 0 }
  const scale = useMemo(() => {
    const s = 1.8 * Math.pow(0.85, depth)
    return Math.max(0.5, s)
  }, [depth])

  // Function to check if all mandatory children are mapped
  const areAllMandatoryChildrenMapped = useMemo(() => {
    if (!hasChildren || !node.children) return false
    
    const mandatoryChildren = node.children.filter(child => 
      child.requiredState === 'required'
    )
    
    if (mandatoryChildren.length === 0) return false
    
    return mandatoryChildren.every(child => 
      child.excelMeta && Object.keys(child.excelMeta).length > 0
    )
  }, [hasChildren, node.children])

  // Compute a futuristic-tinted style for the cube based on required state and mapping status
  const tileStyle = useMemo(() => {
    const style: React.CSSProperties = {
      ['--scale' as any]: String(scale),
      // Indicator theming defaults (inherit cube design language)
      ['--indicator-border' as any]: 'rgba(255,255,255,0.20)',
      ['--indicator-bg' as any]: (hasChildren
        ? 'linear-gradient(180deg, rgba(124,192,255,0.22), rgba(124,192,255,0.10))'
        : 'linear-gradient(180deg, rgba(255,140,26,0.22), rgba(255,140,26,0.10))'),
      ['--indicator-shadow' as any]: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 24px rgba(0,0,0,0.35)'
    }

    // Check if this node has been mapped (has excelMeta)
    const isMapped = node.excelMeta && Object.keys(node.excelMeta).length > 0

    // If mapped or all mandatory children are mapped, apply green styling
    if (isMapped || areAllMandatoryChildrenMapped) {
      const mappedStyle: React.CSSProperties = {
        ...style,
        borderColor: 'rgba(76,175,80,0.45)',
        background: 'linear-gradient(180deg, rgba(76,175,80,0.12), rgba(76,175,80,0.06))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 12px 28px rgba(76,175,80,0.24)',
        ['--indicator-border' as any]: 'rgba(76,175,80,0.45)',
        ['--indicator-bg' as any]: 'linear-gradient(180deg, rgba(76,175,80,0.20), rgba(76,175,80,0.10))',
        ['--indicator-shadow' as any]: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 12px 28px rgba(76,175,80,0.24)'
      }
      if (isDragOver) {
        mappedStyle.borderColor = 'rgba(76,175,80,0.85)'
        mappedStyle.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 2px rgba(76,175,80,0.85), 0 0 28px rgba(76,175,80,0.46)'
      }
      // Cursor hint when hovering with excel drag on expandable cubes
      if (isDragOver && hasChildren) {
        mappedStyle.cursor = 'url("./cursors/circle.cur"), copy'
      }
      return mappedStyle
    }
    if (node.requiredState === 'required') {
      const requiredStyle: React.CSSProperties = {
        ...style,
        borderColor: 'rgba(255,80,80,0.45)',
        background: 'linear-gradient(180deg, rgba(255,80,80,0.12), rgba(255,80,80,0.06))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 12px 28px rgba(255,80,80,0.24)',
        ['--indicator-border' as any]: 'rgba(255,80,80,0.45)',
        ['--indicator-bg' as any]: 'linear-gradient(180deg, rgba(255,80,80,0.20), rgba(255,80,80,0.10))',
        ['--indicator-shadow' as any]: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 12px 28px rgba(255,80,80,0.24)'
      }
      if (isDragOver) {
        requiredStyle.borderColor = 'rgba(255,80,80,0.85)'
        requiredStyle.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 2px rgba(255,80,80,0.85), 0 0 28px rgba(255,80,80,0.46)'
      }
      // Cursor hint when hovering with excel drag on expandable cubes
      if (isDragOver && hasChildren) {
        requiredStyle.cursor = 'url("./cursors/circle.cur"), copy'
      }
      return requiredStyle
    }
    if (isDragOver && hasChildren) {
      style.cursor = 'url("./cursors/circle.cur"), copy'
    }
    return style
  }, [node.requiredState, scale, hasChildren, isDragOver, node.excelMeta, areAllMandatoryChildrenMapped])
  type RowPair = { left?: TreeNodeData; right?: TreeNodeData }
  const childRows = useMemo(() => {
    const children = node.children ?? []
    const rows: RowPair[] = []
    
    // All children in a single vertical column
    for (let i = 0; i < children.length; i++) {
      rows.push({ left: children[i], right: undefined })
    }
    
    return rows
  }, [node.children])

  // Track row elements to compute dynamic spacing to avoid collisions
  const rowRefs = useRef<Array<HTMLDivElement | null>>([])
  const liRef = useRef<HTMLLIElement | null>(null)

  // Robust excel-drag detector (works across browsers that expose DOMStringList)
  const isExcelFieldDrag = (e: React.DragEvent) => {
    try {
      if ((window as any).__excelDragging === true) return true
      const types = e.dataTransfer?.types as unknown as ArrayLike<string> | undefined
      if (types) {
        const arr = Array.from(types)
        if (arr.includes('application/vnd.excel-field')) return true
        // Fallback: our payload also sets application/json; this helps when custom type is stripped
        if (arr.includes('application/json')) return true
      }
    } catch (err) {
      // Debug only; do not break UX
      console.debug('Excel drag detection failed', err)
    }
    return false
  }

  // If expansion occurs by any means, ensure a pending hover timer is cleared
  useEffect(() => {
    if (childrenOpen && hoverExpandTimerRef.current) {
      window.clearTimeout(hoverExpandTimerRef.current)
      hoverExpandTimerRef.current = null
    }
  }, [childrenOpen])

  // Handle search-triggered layout updates
  const handleLayoutUpdate = (e: Event) => {
    const { detail } = e as CustomEvent<{ forceSide: 'left' | 'right' }>
    if (detail?.forceSide) {
      setPreferredSide(detail.forceSide)
      determinePreferredSide()
      scheduleAssignLanes(6)
    }
  }
  
  // Callback ref to attach event listener when element is created
  const tileRefCallback = (element: HTMLDivElement | null) => {
    if (element) {
      element.addEventListener('search:layout-update', handleLayoutUpdate as EventListener)
    }
    // Note: We don't remove the event listener here since the element will be destroyed anyway
  }

  const computeCollisionSpacing = () => {
    // Compute trunk X from the parent's cube center
    let trunkX: number | null = null
    const parentTreeNode = liRef.current?.querySelector(':scope > .tree-node') as HTMLElement | null
    const parentTile = parentTreeNode?.querySelector('.node-tile') as HTMLElement | null
    if (parentTile) {
      const r = parentTile.getBoundingClientRect()
      trunkX = r.left + r.width / 2
    }
    const trunkClearance = 18

    // Collect connector trunk and branch bounds from the nearest connectors svg
    const connectors = document.querySelector('svg[data-role="connectors"]') as SVGSVGElement | null
    const trunkSegments: Array<{ x: number; y1: number; y2: number }> = []
    const branchSegments: Array<{ y: number; x1: number; x2: number }> = []
    if (connectors) {
      connectors.querySelectorAll('path[data-orientation="trunk"]').forEach((el) => {
        const x = parseFloat((el as HTMLElement).getAttribute('data-x') || 'NaN')
        const y1 = parseFloat((el as HTMLElement).getAttribute('data-y1') || 'NaN')
        const y2 = parseFloat((el as HTMLElement).getAttribute('data-y2') || 'NaN')
        if (!Number.isNaN(x) && !Number.isNaN(y1) && !Number.isNaN(y2)) trunkSegments.push({ x, y1, y2 })
      })
      connectors.querySelectorAll('path[data-orientation="branch"]').forEach((el) => {
        // Parse d to pick x1/x2; we also have y attribute
        const y = parseFloat((el as HTMLElement).getAttribute('data-y') || 'NaN')
        const d = el.getAttribute('d') || ''
        const nums = d.match(/[\d.\-]+/g)?.map(parseFloat) || []
        // Expect M x1 y  L x2 y so take first two x values
        if (nums.length >= 4 && !Number.isNaN(y)) {
          const x1 = nums[0]
          const x2 = nums[2]
          if (!Number.isNaN(x1) && !Number.isNaN(x2)) branchSegments.push({ y, x1: Math.min(x1, x2), x2: Math.max(x1, x2) })
        }
      })
    }

    // Track branch bounds across all visible child nodes in this level
    let branchMinX = Number.POSITIVE_INFINITY
    let branchMaxX = Number.NEGATIVE_INFINITY
    let branchMinY = Number.POSITIVE_INFINITY
    let branchMaxY = Number.NEGATIVE_INFINITY

    rowRefs.current.forEach((row) => {
      if (!row) return
      const leftCell = row.querySelector('.branch-cell.left') as HTMLElement | null
      const rightCell = row.querySelector('.branch-cell.right') as HTMLElement | null
      const leftNode = leftCell?.querySelector('.tree-node') as HTMLElement | null
      const rightNode = rightCell?.querySelector('.tree-node') as HTMLElement | null

      // Reset defaults
      row.style.setProperty('--row-extra-spread', '0px')
      row.style.setProperty('--row-left-extra', '0px')
      row.style.setProperty('--row-right-extra', '0px')

      // Pair clearance between left and right children
      if (leftNode && rightNode) {
        const leftRect = leftNode.getBoundingClientRect()
        const rightRect = rightNode.getBoundingClientRect()
        const currentGap = rightRect.left - leftRect.right
        const requiredGap = 140
        const shortage = Math.max(0, requiredGap - currentGap)
        const halfExtra = shortage / 2
        if (halfExtra > 0) {
          row.style.setProperty('--row-extra-spread', `${halfExtra.toFixed(2)}px`)
        }
        branchMinX = Math.min(branchMinX, leftRect.left, rightRect.left)
        branchMaxX = Math.max(branchMaxX, leftRect.right, rightRect.right)
        branchMinY = Math.min(branchMinY, leftRect.top, rightRect.top)
        branchMaxY = Math.max(branchMaxY, leftRect.bottom, rightRect.bottom)
      } else {
        const single = (leftNode || rightNode) as HTMLElement | null
        if (single) {
          const r = single.getBoundingClientRect()
          branchMinX = Math.min(branchMinX, r.left)
          branchMaxX = Math.max(branchMaxX, r.right)
          branchMinY = Math.min(branchMinY, r.top)
          branchMaxY = Math.max(branchMaxY, r.bottom)
        }
      }

      // Trunk clearance relative to this parent
      if (trunkX != null) {
        if (leftNode) {
          const leftRect = leftNode.getBoundingClientRect()
          const needed = Math.max(0, leftRect.right - (trunkX - trunkClearance))
          if (needed > 0) row.style.setProperty('--row-left-extra', `${needed.toFixed(2)}px`)
        }
        if (rightNode) {
          const rightRect = rightNode.getBoundingClientRect()
          const needed = Math.max(0, (trunkX + trunkClearance) - rightRect.left)
          if (needed > 0) row.style.setProperty('--row-right-extra', `${needed.toFixed(2)}px`)
        }
      }

      // Clearance from other visible connector lines (vertical trunks and horizontal branches)
      const ensureClearOfLines = (nodeEl: HTMLElement, isLeft: boolean) => {
        const rect = nodeEl.getBoundingClientRect()
        // Check vertical trunks crossing the node's Y range
        trunkSegments.forEach(({ x, y1, y2 }) => {
          const withinY = !(rect.bottom < y1 || rect.top > y2)
          if (!withinY) return
          const clearance = trunkClearance
          if (isLeft) {
            const needed = Math.max(0, rect.right - (x - clearance))
            if (needed > 0) row.style.setProperty('--row-left-extra', `${Math.max(parseFloat(row.style.getPropertyValue('--row-left-extra') || '0'), needed).toFixed(2)}px`)
          } else {
            const needed = Math.max(0, (x + clearance) - rect.left)
            if (needed > 0) row.style.setProperty('--row-right-extra', `${Math.max(parseFloat(row.style.getPropertyValue('--row-right-extra') || '0'), needed).toFixed(2)}px`)
          }
        })
        // Check horizontal branches near the node's vertical center
        const centerY = rect.top + rect.height / 2
        branchSegments.forEach(({ y, x1, x2 }) => {
          if (Math.abs(y - centerY) > 12) return
          if (isLeft) {
            const needed = Math.max(0, rect.right - (x1 - 12))
            if (needed > 0) row.style.setProperty('--row-left-extra', `${Math.max(parseFloat(row.style.getPropertyValue('--row-left-extra') || '0'), needed).toFixed(2)}px`)
          } else {
            const needed = Math.max(0, (x2 + 12) - rect.left)
            if (needed > 0) row.style.setProperty('--row-right-extra', `${Math.max(parseFloat(row.style.getPropertyValue('--row-right-extra') || '0'), needed).toFixed(2)}px`)
          }
        })
      }

      if (leftNode) ensureClearOfLines(leftNode, true)
      if (rightNode) ensureClearOfLines(rightNode, false)
    })

    // If we found branch bounds, compute a branch-level offset away from external lines
    if (branchMinX < branchMaxX) {
      let needMoveLeft = 0
      let needMoveRight = 0

      // Vertical trunks overlapping our vertical span
      trunkSegments.forEach(({ x, y1, y2 }) => {
        const overlapsY = !(branchMaxY < y1 || branchMinY > y2)
        if (!overlapsY) return
        const clearance = trunkClearance + 6
        if (x >= branchMinX - clearance && x <= branchMaxX + clearance) {
          // Line intersects our branch area; decide direction based on which side of our trunk it's on
          if (trunkX != null && x >= trunkX) {
            // move left
            const needed = Math.max(0, (branchMaxX + clearance) - x)
            needMoveLeft = Math.max(needMoveLeft, needed)
          } else {
            // move right
            const needed = Math.max(0, x - (branchMinX - clearance))
            needMoveRight = Math.max(needMoveRight, needed)
          }
        }
      })

      // Horizontal branches near our span; if overlapping, prefer moving away
      branchSegments.forEach(({ y, x1, x2 }) => {
        if (y < branchMinY - 12 || y > branchMaxY + 12) return
        const clearance = 12
        const overlapsX = !(branchMaxX < x1 - clearance || branchMinX > x2 + clearance)
        if (!overlapsX) return
        // If the segment sits more on the right, push left; else push right
        const segCenter = (x1 + x2) / 2
        const branchCenter = (branchMinX + branchMaxX) / 2
        if (segCenter >= branchCenter) {
          const needed = Math.max(0, (branchMaxX + clearance) - x1)
          needMoveLeft = Math.max(needMoveLeft, needed)
        } else {
          const needed = Math.max(0, x2 - (branchMinX - clearance))
          needMoveRight = Math.max(needMoveRight, needed)
        }
      })

      const offset = needMoveLeft > needMoveRight ? -needMoveLeft : needMoveRight
      liRef.current?.style.setProperty('--branch-offset', `${offset.toFixed(2)}px`)
    }
  }

  // Lane assignment: compute per-row child spread and a single consistent branch offset for all children
  const computeRowLanes = () => {
    // Parent trunk X (center of this tile)
    let trunkX: number | null = null
    const parentTreeNode = liRef.current?.querySelector(':scope > .tree-node') as HTMLElement | null
    const parentTile = parentTreeNode?.querySelector('.node-tile') as HTMLElement | null
    if (parentTile) {
      const r = parentTile.getBoundingClientRect()
      trunkX = r.left + r.width / 2
    }

    const connectors = document.querySelector('svg[data-role="connectors"]') as SVGSVGElement | null
    const trunkSegments: Array<{ x: number; y1: number; y2: number; parentId?: string }> = []
    if (connectors) {
      connectors.querySelectorAll('path[data-orientation="trunk"]').forEach((el) => {
        const x = parseFloat((el as HTMLElement).getAttribute('data-x') || 'NaN')
        const y1 = parseFloat((el as HTMLElement).getAttribute('data-y1') || 'NaN')
        const y2 = parseFloat((el as HTMLElement).getAttribute('data-y2') || 'NaN')
        const parentId = (el as HTMLElement).getAttribute('data-parent-id') || undefined
        if (!Number.isNaN(x) && !Number.isNaN(y1) && !Number.isNaN(y2)) trunkSegments.push({ x, y1, y2, parentId })
      })
    }

    const trunkClearance = 18
    const minSpreadByDepth = 120  // Fixed spread for every cube expansion - increased for better spacing

    // Calculate a single branch offset for all children of this parent (not per-row)
    let globalBranchOffset = 0
    
    // Get the overall bounding box of all children to determine shared collision behavior
    let childrenMinY = Number.POSITIVE_INFINITY
    let childrenMaxY = Number.NEGATIVE_INFINITY
    
    rowRefs.current.forEach((row) => {
      if (!row) return
      const rowRect = row.getBoundingClientRect()
      childrenMinY = Math.min(childrenMinY, rowRect.top)
      childrenMaxY = Math.max(childrenMaxY, rowRect.bottom)
    })

    // Apply consistent collision avoidance for all children as a group
    if (childrenMinY < childrenMaxY) {
      const childrenCenterY = (childrenMinY + childrenMaxY) / 2
      
      trunkSegments.forEach(({ x, y1, y2, parentId }) => {
        // Skip our own trunk (this parent's vertical line)
        if (parentId && parentId === node.id) return
        if (childrenCenterY < y1 || childrenCenterY > y2) return
        
        // Fixed spread calculation for collision detection
        const spread = Math.min(minSpreadByDepth, Math.min(120, window.innerWidth * 0.08))
        const corridorLeft = x - trunkClearance
        const corridorRight = x + trunkClearance
        
        // Check if children would overlap with this trunk
        const leftBound = (trunkX ?? 0) + globalBranchOffset - spread
        const rightBound = (trunkX ?? 0) + globalBranchOffset + spread
        const overlaps = !(rightBound < corridorLeft || leftBound > corridorRight)
        
        if (!overlaps) return
        
        // Push all children away from the trunk consistently
        if (trunkX != null && x >= trunkX) {
          // push left
          const needed = Math.max(0, corridorRight - leftBound)
          globalBranchOffset -= needed
        } else {
          // push right
          const needed = Math.max(0, rightBound - corridorLeft)
          globalBranchOffset += needed
        }
      })
    }

    // Cap branch offset so children never fly off-screen and never cross to the opposite side
    const maxOffsetPx = Math.min(200, window.innerWidth * 0.12)
    globalBranchOffset = Math.max(-maxOffsetPx, Math.min(maxOffsetPx, globalBranchOffset))
    const sideLock = (forcePreferredSide ?? preferredSide)
    if (sideLock === 'left') globalBranchOffset = Math.min(0, globalBranchOffset)
    if (sideLock === 'right') globalBranchOffset = Math.max(0, globalBranchOffset)

    // Apply the same spread and offset to all rows for consistency
    rowRefs.current.forEach((row) => {
      if (!row) return
      
      const spread = Math.min(minSpreadByDepth, Math.min(120, window.innerWidth * 0.08))
      row.style.setProperty('--child-spread', `${spread.toFixed(2)}px`)
      row.style.setProperty('--branch-offset', `${globalBranchOffset.toFixed(2)}px`)
    })
  }

  const scheduleAssignLanes = (frames: number = 8) => {
    let count = 0
    const loop = () => {
      computeRowLanes()
      count += 1
      if (count < frames) requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  const determinePreferredSide = () => {
    if (forcePreferredSide) { setPreferredSide(forcePreferredSide); return }
    // Respect forced side applied via dataset during search-driven reveal
    const li = liRef.current
    const forced = li?.dataset.forceSide as 'left' | 'right' | undefined
    if (forced) { setPreferredSide(forced); delete (li as any).dataset.forceSide; return }
    const parentTreeNode = liRef.current?.querySelector(':scope > .tree-node') as HTMLElement | null
    const parentTile = parentTreeNode?.querySelector('.node-tile') as HTMLElement | null
    if (!parentTile) return
    const rect = parentTile.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const connectors = document.querySelector('svg[data-role="connectors"]') as SVGSVGElement | null
    let nearestX: number | null = null
    if (connectors) {
      connectors.querySelectorAll('path[data-orientation="trunk"]').forEach((el) => {
        const pid = (el as HTMLElement).getAttribute('data-parent-id')
        if (pid === node.id) return
        const x = parseFloat((el as HTMLElement).getAttribute('data-x') || 'NaN')
        const y1 = parseFloat((el as HTMLElement).getAttribute('data-y1') || 'NaN')
        const y2 = parseFloat((el as HTMLElement).getAttribute('data-y2') || 'NaN')
        if (Number.isNaN(x) || Number.isNaN(y1) || Number.isNaN(y2)) return
        if (centerY < y1 || centerY > y2) return
        if (nearestX == null || Math.abs(x - centerX) < Math.abs(nearestX - centerX)) {
          nearestX = x
        }
      })
    }
    if (nearestX != null) {
      setPreferredSide(centerX < nearestX ? 'left' : 'right')
    } else {
      // Fallback: open away from effective viewport center (accounting for ExcelExtractor panel)
      const effectiveViewportStart = 384  // ExcelExtractor width + margins + buffer
      const effectiveViewportWidth = window.innerWidth - effectiveViewportStart
      const vwCenter = effectiveViewportStart + (effectiveViewportWidth / 2)
      setPreferredSide(centerX < vwCenter ? 'left' : 'right')
    }
  }

  return (
    <li ref={liRef} className={`tree-li ${isRoot ? 'root' : ''}`} role={isRoot ? 'treeitem' : 'none'} aria-expanded={hasChildren ? childrenOpen : undefined}>
      <div className="tree-node" data-depth={depth}>
        <div className="node-row" style={indentStyle}>
          <div
            ref={tileRefCallback}
            className={`node-tile ${descOpen ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            onDragEnter={(e) => {
              const isExcelDrag = isExcelFieldDrag(e)
              if (isExcelDrag) {
                dragOverDepthRef.current += 1
                setIsDragOver(true)
                // schedule expand if this node has children and is collapsed
                if (hasChildren && !childrenOpen && !hoverExpandTimerRef.current) {
                  hoverExpandTimerRef.current = window.setTimeout(() => {
                    setChildrenOpen(true)
                    determinePreferredSide()
                    scheduleAssignLanes(6)
                  }, 500)
                }
                return
              }
            }}
            onDragOver={(e) => {
              const isExcelDrag = isExcelFieldDrag(e)
              if (isExcelDrag) {
                // allow drop only for leaves
                if (!hasChildren) {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'copy'
                } else {
                  // Keep events flowing consistently even if drop is disallowed
                  // Prevent default and show a friendly cursor (we still ignore drop in handler)
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'copy'
                  // keep scheduling expand if collapsed
                  if (!childrenOpen && !hoverExpandTimerRef.current) {
                    hoverExpandTimerRef.current = window.setTimeout(() => {
                      setChildrenOpen(true)
                      determinePreferredSide()
                      scheduleAssignLanes(6)
                    }, 500)
                  }
                }
                setIsDragOver(true)
                return
              }
              // fallback
              e.preventDefault()
            }}
            onDrop={(e) => {
              try {
                const raw = e.dataTransfer.getData('application/json')
                if (!raw) return
                const payload = JSON.parse(raw)
                if (payload?.kind === 'excelField') {
                  // accept drop only for leaf nodes (no children)
                  if (!hasChildren) {
                    window.dispatchEvent(new CustomEvent('excel:drop-on-node', { detail: { targetNode: node, field: payload.field } }))
                  } else {
                    // Show error toast identical to Excel upload status toasts
                    const msg = `${node.name} אינו שדה בתקן אלא היררכיה, אפשר להכניס שדות מהאקסל רק לשדות בתקן בעלי סממן ⓘ מעל הקובייה.`
                    window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: msg, type: 'error', durationMs: 5000 } }))
                  }
                }
              } catch {}
              setIsDragOver(false)
              dragOverDepthRef.current = 0
              if (hoverExpandTimerRef.current) { window.clearTimeout(hoverExpandTimerRef.current); hoverExpandTimerRef.current = null }
            }}
            onDragLeave={() => {
              dragOverDepthRef.current = Math.max(0, dragOverDepthRef.current - 1)
              if (dragOverDepthRef.current === 0) {
                setIsDragOver(false)
                if (hoverExpandTimerRef.current) { window.clearTimeout(hoverExpandTimerRef.current); hoverExpandTimerRef.current = null }
              }
            }}
            onClick={() => {
              if (hasChildren) {
                // Check if we're being programmatically clicked via ctrl+f
                const isSearch = liRef.current?.dataset.forceSide !== undefined
                
                setChildrenOpen((o) => {
                  // For search-triggered clicks, always expand regardless of current state
                  const next = isSearch ? true : !o
                  if (next) { 
                    determinePreferredSide(); 
                    scheduleAssignLanes(6)
                    // Clear search flag after successful expansion to restore manual control
                    if (isSearch && liRef.current) {
                      delete (liRef.current as any).dataset.forceSide
                    }
                  }
                  return next
                })
              } else {
                setDescOpen((o) => !o)
              }
            }}
            onContextMenu={(e) => { e.preventDefault(); setDescOpen(o => !o) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDescOpen(o => !o) }}
            style={tileStyle}
            data-node-id={node.id}
            data-dragover={isDragOver ? '1' : '0'}
            data-mapped={node.excelMeta && Object.keys(node.excelMeta).length > 0 ? '1' : '0'}
            data-all-mandatory-mapped={areAllMandatoryChildrenMapped ? '1' : '0'}
            data-required={node.requiredState || undefined}
          >
            {/* Corner indicator (acts as arrow button) */}
            <div
              className="node-indicator"
              role="button"
              tabIndex={0}
              aria-label={hasChildren ? (childrenOpen ? 'Collapse' : 'Expand') : 'No children'}
              onClick={(e) => {
                e.stopPropagation()
                if (hasChildren) {
                  // Check if we're being programmatically clicked via ctrl+f
                  const isSearch = liRef.current?.dataset.forceSide !== undefined
                  
                  setChildrenOpen((o) => {
                    // For search-triggered clicks, always expand regardless of current state
                    const next = isSearch ? true : !o
                    if (next) { 
                      determinePreferredSide(); 
                      scheduleAssignLanes(6)
                      // Clear search flag after successful expansion to restore manual control
                      if (isSearch && liRef.current) {
                        delete (liRef.current as any).dataset.forceSide
                      }
                    }
                    return next
                  })
                } else {
                  setDescOpen((o) => !o)
                }
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); (e.currentTarget as HTMLElement).click() } }}
              data-openable={hasChildren ? '1' : '0'}
              data-dir={hasChildren ? (preferredSide === 'left' ? 'left' : 'right') : 'none'}
              data-open={childrenOpen ? '1' : '0'}
            />
            <div className="node-name">{node.name}</div>
            <div className={`node-type under t-${node.type}`}>{node.type}</div>
          </div>
        </div>

        <div className={`desc-panel ${descOpen ? 'open' : ''}`} data-node-id={`${node.id}-desc`}>
          <div className="desc-content">
            <div className="desc-title">Description</div>
            <div className="desc-text">{node.description || 'No description available.'}</div>
            {node.rules && node.rules.length > 0 && (
              <div className="desc-preview">
                <span className="label">Rules:</span>
                <div style={{ display: 'grid', gap: 4 }}>
                  {node.rules.map((r, i) => (
                    <code key={i}>{r}</code>
                  ))}
                </div>
              </div>
            )}
            {node.valuePreview && (
              <div className="desc-preview">
                <span className="label">Preview</span>
                <code>{node.valuePreview}</code>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasChildren && !isRoot && (
        <div
          className={`binary-children ${childrenOpen ? 'open' : ''}`}
          data-parent-id={node.id}
          style={{
            overflow: childrenOpen ? ('visible' as const) : undefined,
            transform: `translateX(${(forcePreferredSide ?? preferredSide) === 'left' ? '-140px' : '140px'})`
          }}
        >
          {childRows.map((pair, rowIdx) => (
            <div
              className="branch-row"
              key={rowIdx}
              ref={(el) => (rowRefs.current[rowIdx] = el)}
              style={{ zIndex: 10 + rowIdx }}
            >
              {pair.left ? (
                <div className="branch-cell left" key={pair.left.id}>
                  <TreeNode node={pair.left} depth={depth + 1} forcePreferredSide={preferredSide} />
                </div>
              ) : (
                <div className="branch-cell placeholder"></div>
              )}
              {pair.right ? (
                <div className="branch-cell right" key={pair.right.id}>
                  <TreeNode node={pair.right} depth={depth + 1} forcePreferredSide={preferredSide} />
                </div>
              ) : (
                <div className="branch-cell placeholder"></div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasChildren && isRoot && (
        <div className="root-split">
          <div className="root-col left">
            <div
              className={`binary-children ${childrenOpen ? 'open' : ''}`}
              data-parent-id={node.id}
              style={{ overflow: childrenOpen ? ('visible' as const) : undefined }}
            >
              {(node.children ?? []).filter((_, i) => i % 2 === 0).map((child, rowIdx) => (
                <div className="branch-row" key={`L-${child.id}-${rowIdx}`} ref={(el) => (rowRefs.current[rowRefs.current.length] = el)} style={{ zIndex: 10 + rowIdx }}>
                  <div className="branch-cell left"><TreeNode node={child} depth={depth + 1} forcePreferredSide="left" /></div>
                  <div className="branch-cell placeholder"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="root-col right">
            <div
              className={`binary-children ${childrenOpen ? 'open' : ''}`}
              data-parent-id={node.id}
              style={{ overflow: childrenOpen ? ('visible' as const) : undefined }}
            >
              {(node.children ?? []).filter((_, i) => i % 2 === 1).map((child, rowIdx) => (
                <div className="branch-row" key={`R-${child.id}-${rowIdx}`} ref={(el) => (rowRefs.current[rowRefs.current.length] = el)} style={{ zIndex: 10 + rowIdx }}>
                  <div className="branch-cell placeholder"></div>
                  <div className="branch-cell right"><TreeNode node={child} depth={depth + 1} forcePreferredSide="right" /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

