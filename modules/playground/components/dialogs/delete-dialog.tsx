/// This component is responsible for rendering a delete confirmation dialog in the playground. It is used to confirm actions like deleting a file or resetting the playground.

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface DeleteDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  title?: string
  description?: string
  itemName?: string
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
}

/// Renders a delete confirmation dialog with customizable title, description, and button labels. The dialog can be opened or closed based on the `isOpen` prop, and it calls the appropriate callbacks when the confirm or cancel buttons are clicked. The description can include the name of the item being deleted by using the `{item}` placeholder.
function DeleteDialog({
  isOpen,
  setIsOpen,
  title = 'Delete Item',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  itemName,
  onConfirm,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
}: DeleteDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description.replace('{item}', `"${itemName}"`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteDialog
