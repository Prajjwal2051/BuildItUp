"use client";

// This component is responsible for rendering the file explorer sidebar in the playground. It displays a tree structure of files and folders, and it provides actions for selecting, adding, renaming, and deleting files and folders. The component uses various dialogs to handle user interactions for these actions.

import * as React from "react";
import {
    ChevronRight,
    FilePlus2,
    FileText,
    Folder,
    FolderOpen,
    FolderPlus,
    MoreHorizontal,
    Plus,
} from "lucide-react";

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

type OnFileSelect = (filePath: string, file: ExplorerNode) => void;

interface TemplateFileTreeProps {
    data: ExplorerNode;
    onFileSelect?: OnFileSelect;
    selectedFilePath?: string;
    title?: string;
    sidebarWidth?: number;
    onResizeStart?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onAddFile?: (parentPath: string, filename: string, extension: string) => void;
    onAddFolder?: (parentPath: string, folderName: string) => void;
    onDeleteFile?: (filePath: string) => void;
    onDeleteFolder?: (folderPath: string) => void;
    onRenameFile?: (filePath: string, newFilename: string, newExtension: string) => void;
    onRenameFolder?: (folderPath: string, newFolderName: string) => void;
}

interface TemplateNodeProps {
    node: ExplorerNode;
    level: number;
    selectedFilePath?: string;
    onFileSelect?: OnFileSelect;
    onAddFile?: (parentPath: string, filename: string, extension: string) => void;
    onAddFolder?: (parentPath: string, folderName: string) => void;
    onDeleteFile?: (filePath: string) => void;
    onDeleteFolder?: (folderPath: string) => void;
    onRenameFile?: (filePath: string, newFilename: string, newExtension: string) => void;
    onRenameFolder?: (folderPath: string, newFolderName: string) => void;
}

// Utility function to split a filename into its name and extension parts. It returns an object with `filename` and `extension` properties. If there is no extension, the `extension` property will be an empty string.
function splitNameAndExtension(name: string) {
    const i = name.lastIndexOf(".");
    if (i <= 0) return { filename: name, extension: "" };
    return {
        filename: name.slice(0, i),
        extension: name.slice(i + 1),
    };
}

// Sorts explorer nodes by type (directories first) and then alphabetically by name.
function sortNodes(nodes: ExplorerNode[] = []) {
    return [...nodes].sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
}

// This component is responsible for rendering the file explorer sidebar in the playground. It displays a tree structure of files and folders, and it provides actions for selecting, adding, renaming, and deleting files and folders. The component uses various dialogs to handle user interactions for these actions.
function TemplateFileTree({
    data,
    onFileSelect,
    selectedFilePath,
    title = "Explorer",
    sidebarWidth,
    onResizeStart,
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
    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = React.useState(false);
    const [isExplorerOpen, setIsExplorerOpen] = React.useState(true);

    return (
        <div
            style={
                sidebarWidth
                    ? ({ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties)
                    : undefined
            }
            className="relative"
        >
            <Sidebar className="border-r border-[#1c1f26] bg-[#0f1115] text-[#aab1bf]">
                <SidebarContent className="bg-[#0f1115]">
                    <SidebarGroup>

                        {/* HEADER */}
                        <SidebarGroupLabel className="px-6 pr-9 pt-4 pb-3 text-[11px] tracking-widest uppercase text-[#5c6370] font-semibold flex items-center justify-between">
                            {title}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-[#5c6370] hover:text-white transition-colors"
                                onClick={() => setIsExplorerOpen((prev) => !prev)}
                            >
                                <ChevronRight
                                    className={cn("h-3.5 w-3.5 transition-transform", isExplorerOpen && "rotate-90")}
                                />
                            </Button>
                        </SidebarGroupLabel>

                        {isRootFolder && isExplorerOpen && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarGroupAction className="top-3 right-3 rounded-md border border-[#2a2f3a] bg-[#141821] text-[#7f8ea3] hover:bg-[#1b2130] hover:text-white transition-all">
                                        <Plus className="h-4 w-4" />
                                    </SidebarGroupAction>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setIsNewFileDialogOpen(true)}>
                                        <FilePlus2 className="mr-2 h-4 w-4" />
                                        New File
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsNewFolderDialogOpen(true)}>
                                        <FolderPlus className="mr-2 h-4 w-4" />
                                        New Folder
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {isExplorerOpen && (
                            <SidebarGroupContent className="px-2 pb-3">
                                <SidebarMenu className="gap-0.5">
                                    {sortNodes(data.children).map((child) => (
                                        <TemplateNode
                                            key={child.path}
                                            node={child}
                                            level={0}
                                            onFileSelect={onFileSelect}
                                            selectedFilePath={selectedFilePath}
                                            onAddFile={onAddFile}
                                            onAddFolder={onAddFolder}
                                            onDeleteFile={onDeleteFile}
                                            onDeleteFolder={onDeleteFolder}
                                            onRenameFile={onRenameFile}
                                            onRenameFolder={onRenameFolder}
                                        />
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        )}

                    </SidebarGroup>
                </SidebarContent>

                <SidebarRail />

                <button
                    type="button"
                    onMouseDown={onResizeStart}
                    title="Resize explorer"
                    aria-label="Resize explorer"
                    className="absolute right-0 top-0 hidden h-full w-2 translate-x-1/2 cursor-col-resize bg-transparent hover:bg-[#2a2f3a]/40 md:block"
                />

                <NewFileDialog
                    isOpen={isNewFileDialogOpen}
                    onClose={() => setIsNewFileDialogOpen(false)}
                    onCreateFile={(f, e) => {
                        onAddFile?.(rootPath, f, e);
                        setIsNewFileDialogOpen(false);
                    }}
                />

                <NewFolderDialog
                    isOpen={isNewFolderDialogOpen}
                    onClose={() => setIsNewFolderDialogOpen(false)}
                    onCreateFolder={(n) => {
                        onAddFolder?.(rootPath, n);
                        setIsNewFolderDialogOpen(false);
                    }}
                />
            </Sidebar>
        </div>
    );
}

// This component is responsible for rendering each node (file or folder) in the explorer tree. It handles the display of the node, as well as the actions that can be performed on it (selecting, adding, renaming, deleting). For folders, it also recursively renders its children nodes.
function TemplateNode({
    node,
    level,
    selectedFilePath,
    onFileSelect,
    onAddFile,
    onAddFolder,
    onDeleteFile,
    onDeleteFolder,
    onRenameFile,
    onRenameFolder,
}: TemplateNodeProps) {
    const nodePath = node.path || ".";
    const isFolder = node.type === "directory";

    const [isOpen, setIsOpen] = React.useState(level < 2);
    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = React.useState(false);
    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = React.useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

    const paddingLeft = level * 16 + 12;

    if (!isFolder) {
        const parsed = splitNameAndExtension(node.name);
        const selected = selectedFilePath === nodePath;

        return (
            <SidebarMenuItem>
                <div
                    onClick={() => onFileSelect?.(nodePath, node)}
                    className={cn(
                        "group/file-row flex min-w-0 items-center px-3 py-1.25 text-[12.5px] font-mono rounded-md transition-all",
                        selected
                            ? "bg-[#1a1f29] text-white font-semibold"
                            : "text-[#aab1bf] hover:bg-[#151922]"
                    )}
                    style={{ paddingLeft }}
                >
                    <FileText className="mr-3 h-4 w-4 shrink-0 text-[#d19a66]" />

                    <span className="flex min-w-0 flex-1 items-center gap-0.5 pr-2">
                        <span className="truncate font-medium">{parsed.filename}</span>
                        <span className="shrink-0 text-[#5c6370]">.{parsed.extension}</span>
                    </span>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-auto h-6 w-6 shrink-0 opacity-0 pointer-events-none group-hover/file-row:pointer-events-auto group-hover/file-row:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="text-red-400"
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <RenameFileDialog
                    isOpen={isRenameDialogOpen}
                    onClose={() => setIsRenameDialogOpen(false)}
                    onRename={(f, e) => {
                        onRenameFile?.(nodePath, f, e);
                        setIsRenameDialogOpen(false);
                    }}
                    currentFilename={parsed.filename}
                    currentExtension={parsed.extension}
                />

                <DeleteDialog
                    isOpen={isDeleteDialogOpen}
                    setIsOpen={setIsDeleteDialogOpen}
                    onConfirm={() => {
                        onDeleteFile?.(nodePath);
                        setIsDeleteDialogOpen(false);
                    }}
                    title="Delete File"
                    itemName={node.name}
                />
            </SidebarMenuItem>
        );
    }

    return (
        <SidebarMenuItem>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div
                    className="group/folder-row flex min-w-0 items-center px-3 py-1.25 text-[12.5px] font-mono text-[#c5c9d4] hover:bg-[#151922] rounded-md"
                    style={{ paddingLeft }}
                >
                    <CollapsibleTrigger className="flex min-w-0 flex-1 items-center">
                        <ChevronRight
                            className={cn("mr-2 h-3.5 w-3.5 shrink-0 transition-transform", isOpen && "rotate-90")}
                        />

                        {isOpen ? (
                            <FolderOpen className="mr-3 h-4 w-4 shrink-0 text-[#61afef]" />
                        ) : (
                            <Folder className="mr-3 h-4 w-4 shrink-0 text-[#61afef]" />
                        )}

                        <span className="truncate font-semibold">{node.name}</span>
                    </CollapsibleTrigger>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-auto h-6 w-6 shrink-0 opacity-0 pointer-events-none group-hover/folder-row:pointer-events-auto group-hover/folder-row:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsNewFileDialogOpen(true)}>
                                New File
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsNewFolderDialogOpen(true)}>
                                New Folder
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="text-red-400"
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <CollapsibleContent>
                    <SidebarMenuSub className="ml-2 border-l border-[#222833] pl-2">
                        {sortNodes(node.children).map((child) => (
                            <TemplateNode
                                key={child.path}
                                node={child}
                                level={level + 1}
                                selectedFilePath={selectedFilePath}
                                onFileSelect={onFileSelect}
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

            {/* dialogs */}
            <NewFileDialog
                isOpen={isNewFileDialogOpen}
                onClose={() => setIsNewFileDialogOpen(false)}
                onCreateFile={(f, e) => {
                    onAddFile?.(nodePath, f, e);
                    setIsNewFileDialogOpen(false);
                }}
            />

            <NewFolderDialog
                isOpen={isNewFolderDialogOpen}
                onClose={() => setIsNewFolderDialogOpen(false)}
                onCreateFolder={(n) => {
                    onAddFolder?.(nodePath, n);
                    setIsNewFolderDialogOpen(false);
                }}
            />

            <RenameFolderDialog
                isOpen={isRenameDialogOpen}
                onClose={() => setIsRenameDialogOpen(false)}
                onRename={(n) => {
                    onRenameFolder?.(nodePath, n);
                    setIsRenameDialogOpen(false);
                }}
                currentFolderName={node.name}
            />

            <DeleteDialog
                isOpen={isDeleteDialogOpen}
                setIsOpen={setIsDeleteDialogOpen}
                onConfirm={() => {
                    onDeleteFolder?.(nodePath);
                    setIsDeleteDialogOpen(false);
                }}
                title="Delete Folder"
                itemName={node.name}
            />
        </SidebarMenuItem>
    );
}

export default TemplateFileTree;
