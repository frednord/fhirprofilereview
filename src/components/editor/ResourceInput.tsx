import { useId, useRef, useState, type DragEvent } from 'react'
import type { InputStatus } from '../../core/reporting'
import { readTextFile } from '../../utils/readTextFile'

interface ResourceInputProps {
  label: string
  value: string
  status: InputStatus
  onChange: (text: string) => void
}

function StatusLine({ status, id }: { status: InputStatus; id: string }) {
  if (status.ok) {
    return (
      <p id={id} className="text-sm text-slate-600">
        {status.resourceType}
        {status.id === undefined ? ' utan id' : ` ${status.id}`}
      </p>
    )
  }
  if (status.empty) {
    return (
      <p id={id} className="text-sm text-slate-500">
        Klistra in JSON eller ladda upp en fil.
      </p>
    )
  }
  return (
    <p id={id} role="alert" className="text-sm text-red-700">
      {status.message}
    </p>
  )
}

export function ResourceInput({ label, value, status, onChange }: ResourceInputProps) {
  const textareaId = useId()
  const statusId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | undefined>(undefined)
  const [dragging, setDragging] = useState(false)

  const loadFile = async (file: File | undefined): Promise<void> => {
    if (file === undefined) return
    const result = await readTextFile(file)
    if (result.ok) {
      setFileError(undefined)
      onChange(result.text)
    } else {
      setFileError(result.message)
    }
  }

  const onDrop = (event: DragEvent<HTMLTextAreaElement>): void => {
    event.preventDefault()
    setDragging(false)
    void loadFile(event.dataTransfer.files[0])
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={textareaId} className="font-medium text-slate-900">
          {label}
        </label>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
        >
          Ladda upp fil
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json,application/fhir+json"
          aria-label={`Ladda upp fil: ${label}`}
          className="hidden"
          onChange={(event) => {
            void loadFile(event.target.files?.[0])
            // Lets the same file be chosen again after editing the text.
            event.target.value = ''
          }}
        />
      </div>
      <textarea
        id={textareaId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        aria-describedby={statusId}
        spellCheck={false}
        placeholder={'{\n  "resourceType": "Organization",\n  ...\n}'}
        className={`h-72 w-full resize-y rounded-md border bg-white p-3 font-mono text-xs text-slate-800 ${
          dragging ? 'border-sky-500 ring-2 ring-sky-200' : 'border-slate-300'
        }`}
      />
      <StatusLine status={status} id={statusId} />
      {fileError !== undefined && (
        <p role="alert" className="text-sm text-red-700">
          {fileError}
        </p>
      )}
    </div>
  )
}
