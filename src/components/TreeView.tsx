import { memo } from 'react'
import { TreeNodeData } from '../utils/parser'
import { TreeNode } from './TreeNode'

interface TreeViewProps {
  root: TreeNodeData
}

export const TreeView = memo(function TreeView({ root }: TreeViewProps) {
  const isComposite = root.children && root.children.length > 0
  
  return (
    <div className="tree-view">
      <div className="tree-canvas">
        <ul className="tree-root" role="tree">
          <TreeNode node={root} depth={0} isRoot defaultOpenChildren={true} />
        </ul>
      </div>
      {isComposite ? null : <div className="placeholder">No nested fields</div>}
    </div>
  )
})

