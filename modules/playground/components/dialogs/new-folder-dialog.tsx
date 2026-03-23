"use client";

// This component is responsible for rendering a dialog that allows users to create a new folder in the playground. It includes an input field for the folder name, and it calls the appropriate callback when the form is submitted.
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";

/// Renders a dialog for creating a new folder with an input field for the folder name. The dialog can be opened or closed based on the `isOpen` prop, and it calls the `onCreateFolder` callback with the entered folder name when the form is submitted. The folder name input is required.
interface NewFolderDialogProps {
    isOpen: boolean
    onClose: () => void
    onCreateFolder: (folderName: string) => void
  }


  function NewFolderDialog({ isOpen, onClose, onCreateFolder }: NewFolderDialogProps) {
    const [folderName, setFolderName] = React.useState("")
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (folderName.trim()) {
        onCreateFolder(folderName.trim())
        setFolderName("")
      }
    }
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Enter a name for the new folder.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="foldername" className="text-right">
                  Folder Name
                </Label>
                <Input
                  id="foldername"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="col-span-2"
                  autoFocus
                  placeholder="components"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!folderName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  export default NewFolderDialog;