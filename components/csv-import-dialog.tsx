'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export type ColumnDef = {
  key: string
  label: string
  required: boolean
  example: string
}

function generateCSVTemplate(columns: ColumnDef[]): string {
  const header = columns.map(c => c.key).join(',')
  const example = columns.map(c => c.example).join(',')
  return `${header}\n${example}`
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
}

type UploadResult = { success: number; failed: number; errors: string[] }

interface CSVImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnDef[]
  tableName: string
  entityName: string
  /** Transform a parsed row before inserting. Return the cleaned payload. */
  transformRow?: (row: Record<string, string>) => Record<string, any>
  onSuccess?: () => void
}

export function CSVImportDialog({
  open, onOpenChange, columns, tableName, entityName, transformRow, onSuccess,
}: CSVImportDialogProps) {
  const supabase = createClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)

  const clearFile = () => {
    setFile(null)
    setPreview([])
    setPreviewHeaders([])
    setResult(null)
  }

  const handleClose = () => {
    clearFile()
    onOpenChange(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const rows = parseCSV(text)
      if (rows.length > 0) {
        setPreviewHeaders(Object.keys(rows[0]))
        setPreview(rows.slice(0, 5))
      }
    }
    reader.readAsText(selected)
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      if (rows.length === 0) {
        toast.error('CSV file is empty or has no data rows')
        setIsUploading(false)
        return
      }

      const requiredKeys = columns.filter(c => c.required).map(c => c.key)
      const validRows: Record<string, any>[] = []
      const errors: string[] = []

      rows.forEach((row, idx) => {
        const lineNum = idx + 2
        const missing = requiredKeys.filter(k => !row[k]?.trim())
        if (missing.length > 0) {
          errors.push(`Row ${lineNum}: Missing required fields: ${missing.join(', ')}`)
          return
        }

        if (transformRow) {
          validRows.push(transformRow(row))
        } else {
          const payload: Record<string, any> = {}
          columns.forEach(col => {
            const val = row[col.key]?.trim()
            if (val) payload[col.key] = val
          })
          validRows.push(payload)
        }
      })

      let successCount = 0
      if (validRows.length > 0) {
        for (let i = 0; i < validRows.length; i += 50) {
          const batch = validRows.slice(i, i + 50)
          const { error } = await supabase.from(tableName).insert(batch)
          if (error) {
            errors.push(`Batch ${Math.floor(i / 50) + 1}: ${error.message}`)
          } else {
            successCount += batch.length
          }
        }
      }

      setResult({ success: successCount, failed: rows.length - successCount, errors })
      if (successCount > 0) {
        toast.success(`${successCount} ${entityName} imported successfully!`)
        onSuccess?.()
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Import {entityName} from CSV</DialogTitle>
        </DialogHeader>

        {result ? (
          /* ── Results View ── */
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900">{result.success}</p>
                  <p className="text-sm text-green-700">Imported</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-900">{result.failed}</p>
                  <p className="text-sm text-red-700">Failed</p>
                </div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg bg-slate-50 p-3 space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700 font-mono">{err}</p>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── Upload View ── */
          <div className="space-y-4 py-2">
            {/* Column Reference */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Expected CSV Columns</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => downloadCSV(generateCSVTemplate(columns), `${entityName.toLowerCase()}_template.csv`)}
                >
                  <Download className="h-3.5 w-3.5" /> Download Template
                </Button>
              </div>
              <div className="overflow-x-auto border rounded-lg max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Column</TableHead>
                      <TableHead className="text-xs">Required</TableHead>
                      <TableHead className="text-xs">Example</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map(col => (
                      <TableRow key={col.key}>
                        <TableCell className="font-mono text-xs text-blue-700 py-1.5">{col.key}</TableCell>
                        <TableCell className="py-1.5">
                          {col.required ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-medium">Required</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">Optional</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 py-1.5">{col.example}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* File Upload */}
            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <FileSpreadsheet className="h-8 w-8 text-slate-400 mb-1.5" />
                <span className="text-sm font-medium text-slate-600">Click to select a CSV file</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <>
                <div className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">{file.name}</p>
                      <p className="text-xs text-blue-600">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearFile}><X className="h-4 w-4" /></Button>
                </div>

                {preview.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Preview (first {preview.length} rows)</p>
                    <div className="overflow-x-auto border rounded-lg max-h-36 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {previewHeaders.map(h => <TableHead key={h} className="text-[10px] whitespace-nowrap">{h}</TableHead>)}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.map((row, i) => (
                            <TableRow key={i}>
                              {previewHeaders.map(h => (
                                <TableCell key={h} className="text-[11px] py-1.5 max-w-[120px] truncate">{row[h]}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleUpload} disabled={!file || isUploading} className="gap-2">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? 'Importing…' : 'Import'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
