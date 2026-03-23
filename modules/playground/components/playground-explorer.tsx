"use client";

/// This component is responsible for rendering the file explorer in the playground.
import * as React from "react";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarRail,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FileTreeNode } from "@/modules/playground/lib/path-to-json";

import RenameFolderDialog from "./dialogs/rename-folder-dialog";
import NewFolderDialog from "./dialogs/new-folder-dialog";
import NewFileDialog from "./dialogs/new-file-dialog";
import RenameFileDialog from "./dialogs/rename-file-dialog";
import DeleteDialog from "./dialogs/delete-dialog";

type ExplorerNode = FileTreeNode;

// Renders Material Symbols with consistent sizing and tone across the explorer UI.
function MaterialIcon({
    name,
    className,
}: {
    name: string;
    className?: string;
}) {
    return <span className={cn("material-symbols-rounded select-none", className)} aria-hidden="true">{name}</span>;
}

interface TemplateFileTreeProps {
    data: ExplorerNode;
    onFileSelect?: (filePath: string, file: ExplorerNode) => void;
    selectedFilePath?: string;
    title?: string;
    onAddFile?: (parentPath: string, filename: string, extension: string) => void;
    onAddFolder?: (parentPath: string, folderName: string) => void;
    onDeleteFile?: (filePath: string) => void;
    onDeleteFolder?: (folderPath: string) => void;
    onRenameFile?: (filePath: string, newFilename: string, newExtension: string) => void;
    onRenameFolder?: (folderPath: string, newFolderName: string) => void;
}

// Splits a filename into base name and extension so rename dialog fields stay user-friendly.
function splitNameAndExtension(name: string): { filename: string; extension: string } {
    const lastDotIndex = name.lastIndexOf(".");
    if (lastDotIndex <= 0 || lastDotIndex === name.length - 1) {
        return { filename: name, extension: "" };
    }

    return {
        filename: name.slice(0, lastDotIndex),
        extension: name.slice(lastDotIndex + 1),
    };
}

// Sorts folders first, then files, so navigation feels stable and predictable.
function sortNodes(nodes: ExplorerNode[] = []): ExplorerNode[] {
    return [...nodes].sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
}

/// Renders a file tree based on the provided template data. Supports nested folders and files, as well as actions like add, rename, and delete.

function TemplateFileTree({
    data,
    onFileSelect,
    selectedFilePath,
    title = "Explorer",
    onAddFile,
    onAddFolder,
    onDeleteFile,
    onDeleteFolder,
    onRenameFile,
    onRenameFolder,
}: TemplateFileTreeProps) {
    const isRootFolder = data.type === "directory";
    const rootPath = data.path || ".";
    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = React.useState(false);
    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] =
        React.useState(false);

    const handleAddRootFile = () => {
        setIsNewFileDialogOpen(true);
    };

    const handleAddRootFolder = () => {
        setIsNewFolderDialogOpen(true);
    };

    const handleCreateFile = (filename: string, extension: string) => {
        if (onAddFile && isRootFolder) {
            onAddFile(rootPath, filename, extension);
        }
        setIsNewFileDialogOpen(false);
    };

    const handleCreateFolder = (folderName: string) => {
        if (onAddFolder && isRootFolder) {
            onAddFolder(rootPath, folderName);
        }
        setIsNewFolderDialogOpen(false);
    };

    return (
        <Sidebar
            collapsible="none"
            className="font-jetbrains border-r border-[#181a1f] bg-[#282c34] text-[#abb2bf]"
        >
            <SidebarContent className="bg-[#282c34]">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-3 pt-4 pb-3 text-[12px] tracking-[0.1em] uppercase text-[#5c6370]">
                        {title}
                    </SidebarGroupLabel>

                    {isRootFolder && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarGroupAction className="top-3 right-3 rounded-md border border-[#3e4451] bg-[#282c34] text-[#5c6370] transition-all duration-200 hover:scale-105 hover:bg-[#323842] hover:text-[#abb2bf]">
                                    <MaterialIcon name="add" className="text-[16px]" />
                                </SidebarGroupAction>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleAddRootFile}>
                                    <MaterialIcon name="note_add" className="mr-2 text-[16px]" />
                                    New File
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleAddRootFolder}>
                                    <MaterialIcon name="create_new_folder" className="mr-2 text-[16px]" />
                                    New Folder
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <SidebarGroupContent className="px-2 pb-3">
                        <SidebarMenu className="gap-1">
                            {isRootFolder ? (
                                sortNodes(data.children).map((child) => (
                                    <TemplateNode
                                        key={child.path}
                                        node={child}
                                        onFileSelect={onFileSelect}
                                        selectedFilePath={selectedFilePath}
                                        level={0}
                                        onAddFile={onAddFile}
                                        onAddFolder={onAddFolder}
                                        onDeleteFile={onDeleteFile}
                                        onDeleteFolder={onDeleteFolder}
                                        onRenameFile={onRenameFile}
                                        onRenameFolder={onRenameFolder}
                                    />
                                ))
                            ) : (
                                <TemplateNode
                                    node={data}
                                    onFileSelect={onFileSelect}
                                    selectedFilePath={selectedFilePath}
                                    level={0}
                                    onAddFile={onAddFile}
                                    onAddFolder={onAddFolder}
                                    onDeleteFile={onDeleteFile}
                                    onDeleteFolder={onDeleteFolder}
                                    onRenameFile={onRenameFile}
                                    onRenameFolder={onRenameFolder}
                                />
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />

            <NewFileDialog
                isOpen={isNewFileDialogOpen}
                onClose={() => setIsNewFileDialogOpen(false)}
                onCreateFile={handleCreateFile}
            />

            <NewFolderDialog
                isOpen={isNewFolderDialogOpen}
                onClose={() => setIsNewFolderDialogOpen(false)}
                onCreateFolder={handleCreateFolder}
            />
        </Sidebar>
    );
}

interface TemplateNodeProps {
    node: ExplorerNode;
    onFileSelect?: (filePath: string, file: ExplorerNode) => void;
    selectedFilePath?: string;
    level: number;
    onAddFile?: (parentPath: string, filename: string, extension: string) => void;
    onAddFolder?: (parentPath: string, folderName: string) => void;
    onDeleteFile?: (filePath: string) => void;
    onDeleteFolder?: (folderPath: string) => void;
    onRenameFile?: (filePath: string, newFilename: string, newExtension: string) => void;
    onRenameFolder?: (folderPath: string, newFolderName: string) => void;
}

// This component is responsible for rendering a single node in the file tree, which can be either a file or a folder. It supports actions like select, add, rename, and delete for both files and folders, and it handles the display of nested items for folders.

function TemplateNode({
    node,
    onFileSelect,
    selectedFilePath,
    level,
    onAddFile,
    onAddFolder,
    onDeleteFile,
    onDeleteFolder,
    onRenameFile,
    onRenameFolder,
}: TemplateNodeProps) {
    const nodePath = node.path || ".";
    const isFolder = node.type === "directory";
    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = React.useState(false);
    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] =
        React.useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(level < 2);
    const enterAnimationDelay = `${Math.min(level * 45, 240)}ms`;

    if (!isFolder) {
        const file = node;
        const fileName = file.name;
        const parsedName = splitNameAndExtension(fileName);
        const isSelected = selectedFilePath === nodePath;

        const handleRename = () => {
            setIsRenameDialogOpen(true);
        };

        const handleDelete = () => {
            setIsDeleteDialogOpen(true);
        };

        const confirmDelete = () => {
            onDeleteFile?.(nodePath);
            setIsDeleteDialogOpen(false);
        };

        const handleRenameSubmit = (newFilename: string, newExtension: string) => {
            onRenameFile?.(nodePath, newFilename, newExtension);
            setIsRenameDialogOpen(false);
        };

        return (
            <SidebarMenuItem
                className="data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-left-1"
                style={{ animationDelay: enterAnimationDelay }}
            >
                <div className="group flex items-center">
                    <SidebarMenuButton
                        isActive={isSelected}
                        onClick={() => onFileSelect?.(nodePath, file)}
                        className={cn(
                            "flex-1 border border-transparent px-2.5 py-2 transition-all duration-200",
                            "hover:bg-[#2c313c] hover:text-[#d7dae0]",
                            isSelected &&
                            "bg-[#323842] text-[#ffffff]"
                        )}
                    >
                        <MaterialIcon name="description" className={cn("mr-2 text-[17px]", isSelected ? "text-[#e5c07b]" : "text-[#d19a66]")} />
                        <span className="text-[13px]">{fileName}</span>
                    </SidebarMenuButton>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-[#5c6370] opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-[#3e4451] hover:text-[#abb2bf]"
                            >
                                <MaterialIcon name="more_horiz" className="text-[15px]" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleRename}>
                                <MaterialIcon name="drive_file_rename_outline" className="mr-2 text-[16px]" />
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleDelete}
                                className="text-destructive"
                            >
                                <MaterialIcon name="delete" className="mr-2 text-[16px]" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <RenameFileDialog
                    isOpen={isRenameDialogOpen}
                    onClose={() => setIsRenameDialogOpen(false)}
                    onRename={handleRenameSubmit}
                    currentFilename={parsedName.filename}
                    currentExtension={parsedName.extension}
                />

                <DeleteDialog
                    isOpen={isDeleteDialogOpen}
                    setIsOpen={setIsDeleteDialogOpen}
                    onConfirm={confirmDelete}
                    title="Delete File"
                    description="Are you sure you want to delete {item}? This action cannot be undone."
                    itemName={fileName}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                />
            </SidebarMenuItem>
        );
    } else {
        const folder = node;
        const folderName = folder.name;
        const currentPath = nodePath;

        const handleAddFile = () => {
            setIsNewFileDialogOpen(true);
        };

        const handleAddFolder = () => {
            setIsNewFolderDialogOpen(true);
        };

        const handleRename = () => {
            setIsRenameDialogOpen(true);
        };

        const handleDelete = () => {
            setIsDeleteDialogOpen(true);
        };

        const confirmDelete = () => {
            onDeleteFolder?.(nodePath);
            setIsDeleteDialogOpen(false);
        };

        const handleCreateFile = (filename: string, extension: string) => {
            if (onAddFile) {
                onAddFile(currentPath, filename, extension);
            }
            setIsNewFileDialogOpen(false);
        };

        const handleCreateFolder = (folderName: string) => {
            if (onAddFolder) {
                onAddFolder(currentPath, folderName);
            }
            setIsNewFolderDialogOpen(false);
        };

        const handleRenameSubmit = (newFolderName: string) => {
            onRenameFolder?.(nodePath, newFolderName);
            setIsRenameDialogOpen(false);
        };

        return (
            <SidebarMenuItem
                className="data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-left-1"
                style={{ animationDelay: enterAnimationDelay }}
            >
                <Collapsible
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    className="group/collapsible"
                >
                    <div className="group flex items-center">
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                                className={cn(
                                    "flex-1 border border-transparent px-2.5 py-2 transition-all duration-200",
                                    "hover:bg-[#2c313c] hover:text-[#d7dae0]"
                                )}
                            >
                                <MaterialIcon name="chevron_right" className="text-[18px] text-[#5c6370] transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                {isOpen ? (
                                    <MaterialIcon name="folder_open" className="mr-2 text-[17px] text-[#61afef]" />
                                ) : (
                                    <MaterialIcon name="folder" className="mr-2 text-[17px] text-[#61afef]" />
                                )}
                                <span className="text-[13px]">{folderName}</span>
                            </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-[#5c6370] opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-[#3e4451] hover:text-[#abb2bf]"
                                >
                                    <MaterialIcon name="more_horiz" className="text-[15px]" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleAddFile}>
                                    <MaterialIcon name="note_add" className="mr-2 text-[16px]" />
                                    New File
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleAddFolder}>
                                    <MaterialIcon name="create_new_folder" className="mr-2 text-[16px]" />
                                    New Folder
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleRename}>
                                    <MaterialIcon name="drive_file_rename_outline" className="mr-2 text-[16px]" />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleDelete}
                                    className="text-destructive"
                                >
                                    <MaterialIcon name="delete" className="mr-2 text-[16px]" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <CollapsibleContent className="overflow-hidden data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-1 data-closed:animate-out data-closed:fade-out-0">
                        <SidebarMenuSub className="ml-2 border-l border-[#3e4451] pl-2">
                            {sortNodes(folder.children).map((childItem) => (
                                <TemplateNode
                                    key={childItem.path}
                                    node={childItem}
                                    onFileSelect={onFileSelect}
                                    selectedFilePath={selectedFilePath}
                                    level={level + 1}
                                    onAddFile={onAddFile}
                                    onAddFolder={onAddFolder}
                                    onDeleteFile={onDeleteFile}
                                    onDeleteFolder={onDeleteFolder}
                                    onRenameFile={onRenameFile}
                                    onRenameFolder={onRenameFolder}
                                />
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </Collapsible>

                <NewFileDialog
                    isOpen={isNewFileDialogOpen}
                    onClose={() => setIsNewFileDialogOpen(false)}
                    onCreateFile={handleCreateFile}
                />

                <NewFolderDialog
                    isOpen={isNewFolderDialogOpen}
                    onClose={() => setIsNewFolderDialogOpen(false)}
                    onCreateFolder={handleCreateFolder}
                />

                <RenameFolderDialog
                    isOpen={isRenameDialogOpen}
                    onClose={() => setIsRenameDialogOpen(false)}
                    onRename={handleRenameSubmit}
                    currentFolderName={folderName}
                />

                <DeleteDialog
                    isOpen={isDeleteDialogOpen}
                    setIsOpen={setIsDeleteDialogOpen}
                    onConfirm={confirmDelete}
                    title="Delete Folder"
                    description="Are you sure you want to delete {item} and all its contents? This action cannot be undone."
                    itemName={folderName}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                />
            </SidebarMenuItem>
        );
    }
}

export default TemplateFileTree 
