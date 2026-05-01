import React, { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { useToast } from './ui/toast';
import { parseCsv, normalizeRows, SAMPLE_CSV } from '../lib/csv';
import transactionService from '../services/transactionService';
import { cn } from '../lib/utils';

/**
 * Two-stage CSV import:
 *   1. Drop / pick file → parse client-side → preview valid + invalid rows
 *   2. Confirm → POST as JSON to backend bulk-import endpoint
 *
 * Why client-side parse: lets the user see + fix problems before
 * anything hits the server, and skips the multipart-vs-JSON dance on
 * the wire. The backend only ever sees clean rows.
 */
export function CsvImportModal({ open, userId, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null); // { rows: ImportRow[], errors: [] }
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  const reset = useCallback(() => {
    setFile(null);
    setParsed(null);
    setParsing(false);
    setImporting(false);
    setDragActive(false);
  }, []);

  const handleClose = useCallback(() => {
    if (importing) return;
    reset();
    onClose?.();
  }, [importing, onClose, reset]);

  const readFile = useCallback(async (f) => {
    setFile(f);
    setParsing(true);
    try {
      const text = await f.text();
      const csv = parseCsv(text);
      const normalized = normalizeRows(csv);
      setParsed(normalized);
    } catch (err) {
      toast.error('Could not read that file');
      setParsed({ rows: [], errors: [{ row: 0, message: err.message || 'Read failed' }] });
    } finally {
      setParsing(false);
    }
  }, [toast]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) readFile(f);
  }, [readFile]);

  const onPick = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) readFile(f);
  }, [readFile]);

  const downloadSample = useCallback(() => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finora-sample.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const submit = useCallback(async () => {
    if (!parsed?.rows?.length) return;
    setImporting(true);
    try {
      const result = await transactionService.bulkImport(userId, parsed.rows);
      toast.success(`Imported ${result.imported} ${result.imported === 1 ? 'transaction' : 'transactions'}`);
      reset();
      onClose?.();
      onImported?.();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Import failed';
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  }, [parsed, userId, toast, reset, onClose, onImported]);

  const previewRows = useMemo(() => parsed?.rows?.slice(0, 10) || [], [parsed]);
  const errorRows = useMemo(() => parsed?.errors?.slice(0, 10) || [], [parsed]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-2xl my-6"
        onClick={(e) => e.stopPropagation()}
      >
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
            <div>
              <CardTitle>Import transactions from CSV</CardTitle>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
                Drop a bank statement or any CSV with{' '}
                <code className="text-[0.85em] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">date</code>,{' '}
                <code className="text-[0.85em] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">description</code>,{' '}
                <code className="text-[0.85em] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">amount</code>{' '}
                columns. Up to 1000 rows.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="h-8 w-8 -mt-1 -mr-1 grid place-items-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>

          <CardContent className="space-y-4">
            {!file && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                className={cn(
                  'w-full rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-primary/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                )}
              >
                <div className="mx-auto h-12 w-12 rounded-2xl bg-brand-gradient grid place-items-center shadow-md shadow-primary/30 mb-4">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Drop your CSV here, or click to browse
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  We support common bank exports — debit/credit columns, INR/USD symbols, DD/MM/YYYY.
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={onPick}
                />
              </button>
            )}

            {file && (
              <div className="flex items-center gap-3 p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
                <div className="h-9 w-9 rounded-md bg-primary/10 grid place-items-center text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatBytes(file.size)}
                    {parsed && ` · ${parsed.rows.length} valid · ${parsed.errors.length} skipped`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  disabled={importing}
                  className="text-xs px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Replace
                </button>
              </div>
            )}

            {parsing && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                Parsing…
              </div>
            )}

            {parsed && parsed.rows.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--gain))]" />
                  Preview · {parsed.rows.length} {parsed.rows.length === 1 ? 'row' : 'rows'} ready
                  {parsed.rows.length > 10 && ' (showing first 10)'}
                </div>
                <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Date</th>
                        <th className="text-left px-3 py-2 font-medium">Description</th>
                        <th className="text-left px-3 py-2 font-medium">Category</th>
                        <th className="text-right px-3 py-2 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {previewRows.map((r, i) => (
                        <tr key={i} className="text-zinc-700 dark:text-zinc-300">
                          <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                          <td className="px-3 py-2 truncate max-w-[200px]">{r.description}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.category}</td>
                          <td
                            className={cn(
                              'px-3 py-2 text-right tabular-nums whitespace-nowrap',
                              r.type === 'income'
                                ? 'text-[hsl(var(--gain))]'
                                : 'text-[hsl(var(--loss))]'
                            )}
                          >
                            {r.type === 'income' ? '+' : '−'}₹{r.amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {parsed && parsed.errors.length > 0 && (
              <div className="rounded-md border border-amber-300/60 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5">
                <div className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">
                      {parsed.errors.length} {parsed.errors.length === 1 ? 'row' : 'rows'} will be skipped
                    </p>
                    <ul className="space-y-0.5 text-amber-800/80 dark:text-amber-200/80">
                      {errorRows.map((e, i) => (
                        <li key={i}>
                          {e.row > 0 ? `Row ${e.row}: ` : ''}{e.message}
                        </li>
                      ))}
                      {parsed.errors.length > errorRows.length && (
                        <li>…and {parsed.errors.length - errorRows.length} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="justify-between gap-2">
            <button
              type="button"
              onClick={downloadSample}
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 inline-flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download sample
            </button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={importing}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="gradient"
                disabled={importing || !parsed?.rows?.length}
                onClick={submit}
              >
                {importing
                  ? 'Importing…'
                  : parsed?.rows?.length
                  ? `Import ${parsed.rows.length} ${parsed.rows.length === 1 ? 'row' : 'rows'}`
                  : 'Import'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default CsvImportModal;
