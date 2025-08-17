export type JsonNodeType = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null' | 'unknown'

export interface TreeNodeData {
  id: string
  name: string
  type: JsonNodeType
  description?: string
  valuePreview?: string
  children?: TreeNodeData[]
  requiredState?: 'required' | 'conditional' | 'optional'
  rules?: string[]
  // Optional metadata for Excel-driven nodes
  excelMeta?: {
    fieldEssence?: string
    dgh?: string
    always?: string
    mappingDetails?: string
    outputs?: string
  }
}

let autoId = 0
function nextId() {
  autoId += 1
  return String(autoId)
}

function inferType(value: unknown): JsonNodeType {
  if (value === null) return 'null'
  const t = typeof value
  if (Array.isArray(value)) return 'array'
  if (t === 'object') return 'object'
  if (t === 'string') return 'string'
  if (t === 'number') return Number.isInteger(value as number) ? 'integer' : 'number'
  if (t === 'boolean') return 'boolean'
  return 'unknown'
}

function summarize(value: unknown, type: JsonNodeType): { description?: string; preview?: string; excelMeta?: TreeNodeData['excelMeta'] } {
  try {
    switch (type) {
      case 'string': {
        const s = String(value)
        const trimmed = s.length > 64 ? s.slice(0, 61) + '…' : s
        return { description: `String of length ${s.length}.`, preview: '"' + trimmed + '"' }
      }
      case 'number':
        return { description: 'Floating-point numeric value.' }
      case 'integer':
        return { description: 'Numeric value.' }
      case 'boolean':
        return { description: 'Boolean value.' }
      case 'null':
        return { description: 'Null value.' }
      case 'array': {
        const arr = Array.isArray(value) ? value : []
        const len = arr.length
        const itemType = len > 0 ? inferType(arr[0]) : 'unknown'
        const previewItems = arr.slice(0, 5).map((v) => safePreview(v))
        return {
          description: `Array with ${len} item${len === 1 ? '' : 's'}${itemType !== 'unknown' ? ` (e.g., ${itemType})` : ''}.`,
          preview: `[${previewItems.join(', ')}${len > 5 ? ', …' : ''}]`,
        }
      }
      case 'object': {
        const obj = (value && typeof value === 'object') ? value as Record<string, unknown> : {}
        // Special case: Excel-injected leaf-like wrapper
        if ('preview' in obj || 'excelMeta' in obj) {
          const preview = typeof obj.preview === 'string' ? obj.preview : undefined
          const excelMeta = obj.excelMeta as TreeNodeData['excelMeta'] | undefined
          return { description: undefined, preview, excelMeta }
        }
        const keys = Object.keys(obj)
        const sampleKeys = keys.slice(0, 5)
        return {
          description: `Object with ${keys.length} key${keys.length === 1 ? '' : 's'}.`,
          preview: `{ ${sampleKeys.join(', ')}${keys.length > 5 ? ', …' : ''} }`,
        }
      }
      default:
        return {}
    }
  } catch {
    return {}
  }
}

function safePreview(value: unknown): string {
  const t = inferType(value)
  if (t === 'string') return '"' + String(value).replace(/\s+/g, ' ').slice(0, 24) + (String(value).length > 24 ? '…' : '') + '"'
  if (t === 'number' || t === 'boolean' || t === 'null') return String(value)
  if (t === 'array') return '[…]'
  if (t === 'object') return '{…}'
  return String(value)
}

export function buildTreeFromValue(name: string, value: unknown, path: string[] = []): TreeNodeData {
  const type = inferType(value)
  const { description, preview, excelMeta } = summarize(value, type)

  const node: TreeNodeData = {
    id: (path.length ? path.join('.') : 'root') + ':' + nextId(),
    name,
    type,
    description,
    valuePreview: preview,
    excelMeta,
  }

  if (type === 'object') {
    const obj = value as Record<string, unknown>
    // Treat Excel leaf wrapper as a leaf node (no children)
    if (obj && (Object.prototype.hasOwnProperty.call(obj, 'preview') || Object.prototype.hasOwnProperty.call(obj, 'excelMeta'))) {
      // Recast as a leaf for display purposes
      ;(node as any).type = 'string'
      return node
    }
    const keys = Object.keys(obj).sort()
    node.children = keys.map((key) => buildTreeFromValue(key, obj[key], [...path, key]))
  } else if (type === 'array') {
    const arr = value as unknown[]
    node.children = arr.map((item, index) => buildTreeFromValue(`[${index}]`, item, [...path, String(index)]))
  }

  return node
}

// Minimal JSON Schema types used for parsing
type JSONSchema = {
  title?: string
  description?: string
  type?: string | string[]
  properties?: Record<string, JSONSchema>
  items?: JSONSchema | JSONSchema[]
  required?: string[]
  anyOf?: JSONSchema[]
  oneOf?: JSONSchema[]
  allOf?: JSONSchema[]
  // Common validation keywords
  pattern?: string
  minLength?: number
  maxLength?: number
  format?: string
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  enum?: unknown[]
  const?: unknown
}

function isLikelyJsonSchema(value: unknown): value is JSONSchema {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if ('$schema' in v) return true
  if ('properties' in v && typeof v.properties === 'object') return true
  if ('type' in v && (v.type === 'object' || v.type === 'array')) return true
  return false
}

function normalizeSchemaType(schema: JSONSchema): JsonNodeType {
  const t = Array.isArray(schema.type) ? schema.type[0] : schema.type
  if (!t) return 'object'
  if (t === 'integer') return 'integer'
  if (t === 'number') return 'number'
  if (t === 'string') return 'string'
  if (t === 'boolean') return 'boolean'
  if (t === 'null') return 'null'
  if (t === 'array') return 'array'
  return 'object'
}

function extractRules(schema: JSONSchema): string[] | undefined {
  const rules: string[] = []
  if (schema.enum) rules.push(`enum: ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}`)
  if (schema.const !== undefined) rules.push(`const: ${JSON.stringify(schema.const)}`)
  if (schema.pattern) rules.push(`pattern: ${schema.pattern}`)
  if (typeof schema.minLength === 'number') rules.push(`minLength: ${schema.minLength}`)
  if (typeof schema.maxLength === 'number') rules.push(`maxLength: ${schema.maxLength}`)
  if (schema.format) rules.push(`format: ${schema.format}`)
  if (typeof schema.minimum === 'number') rules.push(`minimum: ${schema.minimum}`)
  if (typeof schema.maximum === 'number') rules.push(`maximum: ${schema.maximum}`)
  if (typeof schema.exclusiveMinimum === 'number') rules.push(`exclusiveMinimum: ${schema.exclusiveMinimum}`)
  if (typeof schema.exclusiveMaximum === 'number') rules.push(`exclusiveMaximum: ${schema.exclusiveMaximum}`)
  if (typeof schema.multipleOf === 'number') rules.push(`multipleOf: ${schema.multipleOf}`)
  return rules.length ? rules : undefined
}

function buildTreeFromSchema(name: string, schema: JSONSchema, path: string[] = [], parentPropertyRequired: boolean = true): TreeNodeData {
  const nodeType = normalizeSchemaType(schema)
  const node: TreeNodeData = {
    id: (path.length ? path.join('.') : 'root') + ':' + nextId(),
    name,
    type: nodeType,
    description: schema.description,
    rules: extractRules(schema),
  }

  // Support composition via allOf by appending each composed schema as a child subtree
  const allOfChildren: TreeNodeData[] = Array.isArray(schema.allOf) && schema.allOf.length > 0
    ? schema.allOf.map((sub, idx) => {
        const childName = sub.title || `[allOf ${idx + 1}]`
        const childKey = (sub.title?.replace(/\s+/g, '_') || `allOf_${idx + 1}`)
        return buildTreeFromSchema(childName, sub, [...path, childKey], parentPropertyRequired)
      })
    : []

  if (nodeType === 'object') {
    const props = schema.properties ?? {}
    const keys = Object.keys(props).sort()
    const requiredKeys = new Set<string>((schema.required ?? []))
    const propChildren = keys.map((key) => {
      const childSchema = props[key]
      const isRequiredHere = requiredKeys.has(key)
      // Child's required state depends on whether this object property (this node) is itself required
      const child = buildTreeFromSchema(key, childSchema, [...path, key], isRequiredHere && parentPropertyRequired)
      child.requiredState = isRequiredHere
        ? (parentPropertyRequired ? 'required' : 'conditional')
        : 'optional'
      return child
    })
    node.children = [...propChildren, ...allOfChildren]
  } else if (nodeType === 'array') {
    const items = schema.items
    if (Array.isArray(items)) {
      node.children = items.map((s, idx) => buildTreeFromSchema(`[${idx}]`, s, [...path, String(idx)], parentPropertyRequired))
    } else if (items) {
      node.children = [buildTreeFromSchema('[item]', items, [...path, 'item'], parentPropertyRequired)]
    }
    // Append any allOf-composed children under array node as additional branches
    if (allOfChildren.length) {
      node.children = (node.children ?? []).concat(allOfChildren)
    }
  } else {
    // Non-object/array nodes can still carry allOf compositions; append as children
    if (allOfChildren.length) {
      node.children = allOfChildren
    }
  }

  return node
}

export function buildTree(value: unknown): TreeNodeData {
  if (isLikelyJsonSchema(value)) {
    // Use title as root name if provided
    const schema = value as JSONSchema
    const rootName = schema.title || 'root'
    return buildTreeFromSchema(rootName, schema, [], true)
  }
  return buildTreeFromValue('root', value)
}

