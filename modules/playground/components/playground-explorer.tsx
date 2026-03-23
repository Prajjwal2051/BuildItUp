"use client";

// This component is responsible for rendering the file explorer sidebar in the playground. It displays a tree structure of files and folders, and it provides actions for selecting, adding, renaming, and deleting files and folders. The component uses various dialogs to handle user interactions for these actions.

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
// Utility component for rendering Material Icons with consistent styling.
function MaterialIcon({ name, className }: { name: string; className?: string }) {
    return (
        <span className={cn("material-symbols-rounded select-none", className)}>
            {name}
        </span>
    );
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
    onAddFile,
    onAddFolder,
    onDeleteFile,
    onDeleteFolder,
    onRenameFile,
    onRenameFolder,
}: any) {
    const isRootFolder = data.type === "directory";
    const rootPath = data.path || ".";

    const [isNewFileDialogOpen, setIsNewFileDialogOpen] = React.useState(false);
    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = React.useState(false);

    return (
        <Sidebar className="border-r border-[#1c1f26] bg-[#0f1115] text-[#aab1bf]">
            <SidebarContent className="bg-[#0f1115]">
                <SidebarGroup>

                    {/* HEADER */}
                    <SidebarGroupLabel className="px-4 pt-4 pb-3 text-[11px] tracking-widest uppercase text-[#5c6370] font-semibold">
                        {title}
                    </SidebarGroupLabel>

                    {isRootFolder && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarGroupAction className="top-3 right-3 rounded-md border border-[#2a2f3a] bg-[#141821] text-[#7f8ea3] hover:bg-[#1b2130] hover:text-white transition-all">
                                    <MaterialIcon name="add" className="text-[16px]" />
                                </SidebarGroupAction>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsNewFileDialogOpen(true)}>
                                    <MaterialIcon name="note_add" className="mr-2 text-[16px]" />
                                    New File
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsNewFolderDialogOpen(true)}>
                                    <MaterialIcon name="create_new_folder" className="mr-2 text-[16px]" />
                                    New Folder
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <SidebarGroupContent className="px-2 pb-3">
                        <SidebarMenu className="gap-[2px]">
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
                </SidebarGroup>
            </SidebarContent>

            <SidebarRail />

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
}: any) {
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
                        "group flex items-center px-3 py-[5px] text-[12.5px] font-mono rounded-md transition-all",
                        selected
                            ? "bg-[#1a1f29] text-white font-semibold"
                            : "text-[#aab1bf] hover:bg-[#151922]"
                    )}
                    style={{ paddingLeft }}
                >
                    <MaterialIcon name="description" className="mr-3 text-[15px] text-[#d19a66]" />

                    <span className="flex items-center gap-[2px] truncate">
                        <span className="font-medium">{parsed.filename}</span>
                        <span className="text-[#5c6370]">.{parsed.extension}</span>
                    </span>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-auto h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                ···
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
                    className="group flex items-center px-3 py-[5px] text-[12.5px] font-mono text-[#c5c9d4] hover:bg-[#151922] rounded-md"
                    style={{ paddingLeft }}
                >
                    <CollapsibleTrigger className="flex items-center w-full">
                        <MaterialIcon
                            name="chevron_right"
                            className={cn("mr-2 text-[14px]", isOpen && "rotate-90")}
                        />

                        <MaterialIcon
                            name={isOpen ? "folder_open" : "folder"}
                            className="mr-3 text-[#61afef]"
                        />

                        <span className="font-semibold">{node.name}</span>
                    </CollapsibleTrigger>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-auto h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                ···
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
                        {sortNodes(node.children).map((child: any) => (
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