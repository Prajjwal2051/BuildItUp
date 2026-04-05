'use client'
// This component is responsible for rendering a dialog that allows users to create a new file in the playground. It includes input fields for the filename and extension, and it calls the appropriate callback when the form is submitted.

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React from 'react'

interface NewFileDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateFile: (filename: string, extension: string) => void
}

/// Renders a dialog for creating a new file with input fields for the filename and extension. The dialog can be opened or closed based on the `isOpen` prop, and it calls the `onCreateFile` callback with the entered filename and extension when the form is submitted. The filename input is required, while the extension defaults to "js" if left empty.
function NewFileDialog({ isOpen, onClose, onCreateFile }: NewFileDialogProps) {
  const [filename, setFilename] = React.useState('')
  const [extension, setExtension] = React.useState('js')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (filename.trim()) {
      onCreateFile(filename.trim(), extension.trim() || 'js')
      setFilename('')
      setExtension('js')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New File</DialogTitle>
          <DialogDescription>
            Enter a name for the new file and select its extension.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="filename" className="text-right">
                Filename
              </Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="col-span-2"
                autoFocus
                placeholder="main"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="extension" className="text-right">
                Extension
              </Label>
              <Input
                id="extension"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                className="col-span-2"
                placeholder="js"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!filename.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default NewFileDialog
