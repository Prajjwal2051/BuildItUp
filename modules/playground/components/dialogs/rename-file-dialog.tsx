"use client";
// This component is responsible for rendering a dialog that allows users to rename a file in the playground. It includes input fields for the new filename and extension, and it calls the appropriate callback when the form is submitted.

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


interface RenameFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (filename: string, extension: string) => void;
  currentFilename: string;
  currentExtension: string;
}

// Normalizes dialog inputs so the component never stores undefined/null in local state.
function toSafeText(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

/// Renders a dialog for renaming a file with input fields for the new filename and extension. The dialog can be opened or closed based on the `isOpen` prop, and it calls the `onRename` callback with the entered filename and extension when the form is submitted. The filename input is required, while the extension defaults to the current extension if left empty.
function RenameFileDialog({
  isOpen,
  onClose,
  onRename,
  currentFilename,
  currentExtension,
}: RenameFileDialogProps) {
  const [filename, setFilename] = React.useState(() => toSafeText(currentFilename));
  const [extension, setExtension] = React.useState(() => toSafeText(currentExtension));

  React.useEffect(() => {
    if (isOpen) {
      setFilename(toSafeText(currentFilename));
      setExtension(toSafeText(currentExtension));
    }
  }, [isOpen, currentFilename, currentExtension]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedFilename = filename.trim();
    const trimmedExtension = extension.trim();

    if (trimmedFilename) {
      onRename(trimmedFilename, trimmedExtension || toSafeText(currentExtension));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
          <DialogDescription>Enter a new name for the file.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="rename-filename" className="text-right">
                Filename
              </Label>
              <Input
                id="rename-filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="col-span-2"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="rename-extension" className="text-right">
                Extension
              </Label>
              <Input
                id="rename-extension"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                className="col-span-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!filename.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RenameFileDialog;
