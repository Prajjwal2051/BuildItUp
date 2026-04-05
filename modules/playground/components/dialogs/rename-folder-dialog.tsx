'use client'
// This component is responsible for rendering a dialog that allows users to rename a folder in the playground. It includes an input field for the new folder name, and it calls the appropriate callback when the form is submitted.
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

interface RenameFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  onRename: (folderName: string) => void
  currentFolderName: string
}

/// Renders a dialog for renaming a folder with an input field for the new folder name. The dialog can be opened or closed based on the `isOpen` prop, and it calls the `onRename` callback with the entered folder name when the form is submitted. The folder name input is required.
function RenameFolderDialog({
  isOpen,
  onClose,
  onRename,
  currentFolderName,
}: RenameFolderDialogProps) {
  const [folderName, setFolderName] = React.useState(currentFolderName)

  React.useEffect(() => {
    if (isOpen) {
      setFolderName(currentFolderName)
    }
  }, [isOpen, currentFolderName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (folderName.trim()) {
      onRename(folderName.trim())
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
          <DialogDescription>Enter a new name for the folder.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="rename-foldername" className="text-right">
                Folder Name
              </Label>
              <Input
                id="rename-foldername"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="col-span-2"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!folderName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default RenameFolderDialog
