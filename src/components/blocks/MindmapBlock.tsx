'use client'

import { useState, useEffect, useRef } from 'react'

export type MindmapNode = { id: string; text: string; children: MindmapNode[] }
export type MindmapContent = { root: MindmapNode }

interface MindmapBlockProps {
  content: MindmapContent
  isEditing: boolean
  onChange: (content: MindmapContent) => void
}

// 텍스트 트리를 MindmapNode 트리로 파싱
function parseTextToTree(text: string): MindmapNode {
  const lines = text.split('\n').filter((l) => l.trim() !== '')
  let idCounter = 0
  const nextId = () => String(++idCounter)

  if (lines.length === 0) return { id: nextId(), text: '중심 주제', children: [] }

  const root: MindmapNode = { id: nextId(), text: lines[0].trim(), children: [] }
  const stack: { node: MindmapNode; depth: number }[] = [{ node: root, depth: 0 }]

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const stripped = line.replace(/^\s+/, '')
    const depth = line.length - stripped.length

    const node: MindmapNode = { id: nextId(), text: stripped, children: [] }

    // depth에 맞는 부모 찾기
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop()
    }
    stack[stack.length - 1].node.children.push(node)
    stack.push({ node, depth })
  }

  return root
}

// MindmapNode 트리를 텍스트로 변환
function treeToText(node: MindmapNode, depth = 0): string {
  const indent = '  '.repeat(depth)
  let result = `${indent}${node.text}`
  for (const child of node.children) {
    result += '\n' + treeToText(child, depth + 1)
  }
  return result
}

// 레이아웃 계산
interface NodeLayout {
  id: string
  text: string
  x: number
  y: number
  depth: number
  children: NodeLayout[]
}

const NODE_W = 100
const NODE_H = 36
const H_GAP = 60
const V_GAP = 16

function computeLayout(node: MindmapNode, depth: number, startY: number): { layout: NodeLayout; height: number } {
  if (node.children.length === 0) {
    const layout: NodeLayout = { id: node.id, text: node.text, x: depth * (NODE_W + H_GAP), y: startY, depth, children: [] }
    return { layout, height: NODE_H }
  }

  const childLayouts: NodeLayout[] = []
  let totalHeight = 0
  for (let i = 0; i < node.children.length; i++) {
    const { layout: cl, height: ch } = computeLayout(node.children[i], depth + 1, startY + totalHeight)
    childLayouts.push(cl)
    totalHeight += ch + (i < node.children.length - 1 ? V_GAP : 0)
  }

  const selfY = startY + totalHeight / 2 - NODE_H / 2
  const layout: NodeLayout = {
    id: node.id,
    text: node.text,
    x: depth * (NODE_W + H_GAP),
    y: selfY,
    depth,
    children: childLayouts,
  }
  return { layout, height: totalHeight }
}

const DEPTH_COLORS = ['#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe']

function getNodeColor(depth: number) {
  return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)]
}

function getBorderColor(depth: number) {
  const colors = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd']
  return colors[Math.min(depth, colors.length - 1)]
}

function collectNodes(layout: NodeLayout): NodeLayout[] {
  return [layout, ...layout.children.flatMap(collectNodes)]
}

function collectEdges(layout: NodeLayout): { from: NodeLayout; to: NodeLayout }[] {
  const edges: { from: NodeLayout; to: NodeLayout }[] = []
  for (const child of layout.children) {
    edges.push({ from: layout, to: child })
    edges.push(...collectEdges(child))
  }
  return edges
}

function MindmapSVG({ root }: { root: MindmapNode }) {
  const { layout, height } = computeLayout(root, 0, 8)
  const allNodes = collectNodes(layout)
  const edges = collectEdges(layout)

  // SVG 크기 계산
  const maxX = Math.max(...allNodes.map((n) => n.x + NODE_W)) + 16
  const maxY = Math.max(...allNodes.map((n) => n.y + NODE_H)) + 16
  const svgW = Math.max(400, maxX)
  const svgH = Math.max(300, maxY)

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block', maxWidth: '100%' }}>
      {/* 연결선 */}
      {edges.map(({ from, to }, i) => {
        const x1 = from.x + NODE_W
        const y1 = from.y + NODE_H / 2
        const x2 = to.x
        const y2 = to.y + NODE_H / 2
        const cx1 = x1 + H_GAP * 0.5
        const cx2 = x2 - H_GAP * 0.5
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke="#bae6fd"
            strokeWidth={1.5}
          />
        )
      })}
      {/* 노드 */}
      {allNodes.map((n) => (
        <g key={n.id}>
          <rect
            x={n.x}
            y={n.y}
            width={NODE_W}
            height={NODE_H}
            rx={8}
            fill={getNodeColor(n.depth)}
            stroke={getBorderColor(n.depth)}
            strokeWidth={1.5}
          />
          <text
            x={n.x + NODE_W / 2}
            y={n.y + NODE_H / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={n.depth === 0 ? 12 : 11}
            fontWeight={n.depth === 0 ? 'bold' : 'normal'}
            fill="#0c4a6e"
          >
            {n.text.length > 10 ? n.text.slice(0, 10) + '…' : n.text}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function MindmapBlock({ content, isEditing, onChange }: MindmapBlockProps) {
  const defaultRoot: MindmapNode = content.root || { id: '1', text: '중심 주제', children: [] }
  const [localRoot, setLocalRoot] = useState<MindmapNode>(defaultRoot)
  const [textInput, setTextInput] = useState(() => treeToText(defaultRoot))

  useEffect(() => {
    const r = content.root || { id: '1', text: '중심 주제', children: [] }
    setLocalRoot(r)
    setTextInput(treeToText(r))
  }, [content])

  const handleTextChange = (val: string) => {
    setTextInput(val)
    const parsed = parseTextToTree(val)
    setLocalRoot(parsed)
    onChange({ root: parsed })
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-sky-600">들여쓰기(공백 2칸)로 계층 구조를 표현하세요.</p>
        <textarea
          value={textInput}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder={'중심 주제\n  아이디어 1\n    세부 항목\n  아이디어 2'}
          className="w-full bg-white/70 border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900 font-mono outline-none focus:border-sky-400 resize-y"
        />
        <div className="border border-sky-200 rounded-xl overflow-auto p-4 bg-white/50">
          <p className="text-xs text-sky-500 mb-2">미리보기</p>
          <MindmapSVG root={localRoot} />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <MindmapSVG root={localRoot} />
    </div>
  )
}
