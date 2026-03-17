'use client'

import { useState, useEffect } from 'react'
import { TableContent } from '@/lib/supabase'

interface TableBlockProps {
  content: TableContent
  isEditing: boolean
  onChange: (content: TableContent) => void
}

export default function TableBlock({ content, isEditing, onChange }: TableBlockProps) {
  const [localColumns, setLocalColumns] = useState<string[]>(content.columns || ['열 1', '열 2', '열 3'])
  const [localRows, setLocalRows] = useState<string[][]>(content.rows || [['', '', '']])

  useEffect(() => {
    setLocalColumns(content.columns || ['열 1', '열 2', '열 3'])
    setLocalRows(content.rows || [['', '', '']])
  }, [content])

  const update = (columns: string[], rows: string[][]) => {
    onChange({ columns, rows })
  }

  const addColumn = () => {
    const newColumns = [...localColumns, `열 ${localColumns.length + 1}`]
    const newRows = localRows.map((row) => [...row, ''])
    setLocalColumns(newColumns)
    setLocalRows(newRows)
    update(newColumns, newRows)
  }

  const removeColumn = (colIndex: number) => {
    if (localColumns.length <= 1) return
    const newColumns = localColumns.filter((_, i) => i !== colIndex)
    const newRows = localRows.map((row) => row.filter((_, i) => i !== colIndex))
    setLocalColumns(newColumns)
    setLocalRows(newRows)
    update(newColumns, newRows)
  }

  const updateColumn = (colIndex: number, value: string) => {
    const newColumns = localColumns.map((c, i) => i === colIndex ? value : c)
    setLocalColumns(newColumns)
    update(newColumns, localRows)
  }

  const addRow = () => {
    const newRow = new Array(localColumns.length).fill('')
    const newRows = [...localRows, newRow]
    setLocalRows(newRows)
    update(localColumns, newRows)
  }

  const removeRow = (rowIndex: number) => {
    if (localRows.length <= 1) return
    const newRows = localRows.filter((_, i) => i !== rowIndex)
    setLocalRows(newRows)
    update(localColumns, newRows)
  }

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = localRows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => ci === colIndex ? value : cell) : row
    )
    setLocalRows(newRows)
    update(localColumns, newRows)
  }

  if (isEditing) {
    return (
      <div className="space-y-3 overflow-x-auto">
        <table className="w-full border-collapse min-w-[400px]">
          <thead>
            <tr>
              {localColumns.map((col, ci) => (
                <th key={ci} className="border border-sky-200 p-0">
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={col}
                      onChange={(e) => updateColumn(ci, e.target.value)}
                      className="flex-1 bg-sky-100/80 px-3 py-2 text-sky-950 text-sm font-semibold outline-none w-full focus:bg-sky-100 transition-colors"
                    />
                    {localColumns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(ci)}
                        className="px-2 py-2 text-sky-700 hover:text-red-400 transition-colors flex-shrink-0 bg-sky-100/80"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="border border-sky-200 bg-sky-100/80 w-8">
                <button
                  type="button"
                  onClick={addColumn}
                  className="w-full h-full flex items-center justify-center text-sky-800 hover:text-sky-700 transition-colors p-2"
                  title="열 추가"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {localRows.map((row, ri) => (
              <tr key={ri}>
                {localColumns.map((_, ci) => (
                  <td key={ci} className="border border-sky-200 p-0">
                    <input
                      type="text"
                      value={row[ci] || ''}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      placeholder="..."
                      className="w-full bg-transparent px-3 py-2 text-sky-900 text-sm outline-none placeholder-sky-300 focus:bg-sky-50 transition-colors"
                    />
                  </td>
                ))}
                <td className="border border-sky-200 bg-sky-50/60 w-8">
                  {localRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(ri)}
                      className="w-full h-full flex items-center justify-center text-sky-700 hover:text-red-400 transition-colors p-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-2 text-sm text-sky-800 hover:text-sky-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          행 추가
        </button>
      </div>
    )
  }

  if (!localColumns.length) {
    return (
      <div className="text-sky-700 text-sm italic py-4 text-center">
        테이블이 없습니다. 편집 모드에서 구성해주세요.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-sky-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-sky-100/80">
            {localColumns.map((col, i) => (
              <th key={i} className="px-4 py-3 text-left text-sky-950 text-sm font-semibold border-b border-sky-200 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {localRows.map((row, ri) => (
            <tr key={ri} className="hover:bg-sky-50/60 transition-colors border-b border-sky-300/50 last:border-0">
              {localColumns.map((_, ci) => (
                <td key={ci} className="px-4 py-3 text-sky-900 text-sm">
                  {row[ci] || <span className="text-sky-700">-</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
