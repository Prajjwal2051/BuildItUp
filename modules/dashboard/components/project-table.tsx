"use client"

import { format } from "date-fns"
import type { Project } from "../types"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useState } from "react"
import { MoreHorizontal, Edit3, Trash2, ExternalLink, Copy, Download, Eye, Star } from "lucide-react"
import { toast } from "sonner"
import { deletePlaygroundById, duplicatePlaygroundById, editPlaygroundById, togglePlaygroundStarMark } from "@/modules/dashboard/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"


interface ProjectTableProps {
    projects: Project[]
    currentUserName?: string
    currentUserImage?: string | null
}

interface EditProjectData {
    title: string
    description: string
}

function ProjectTable({
    projects,
    currentUserName,
    currentUserImage,
}: ProjectTableProps) {
    const router = useRouter()
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [editData, setEditData] = useState<EditProjectData>({ title: "", description: "" })
    const [isLoading, setIsLoading] = useState(false)

    const handleEditClick = (project: Project) => {
        setSelectedProject(project)
        setEditData({ title: project.title, description: project.description || "" })
        setEditDialogOpen(true)
    }

    const handleDeleteClick = async (project: Project) => {
        setSelectedProject(project)
        setDeleteDialogOpen(true)
    }

    const handleUpdateProject = async () => {
        if (!selectedProject) return
        setIsLoading(true)
        try {
            await editPlaygroundById(selectedProject.id, editData)
            toast.success("Project updated successfully!")
            setEditDialogOpen(false)
        } catch (error) {
            toast.error("Failed to update project. Please try again.")
            console.error("Error updating project:", error)
        }
        finally {
            setIsLoading(false)
        }
    }

    const handleDeleteProject = async () => {
        if (!selectedProject) return
        setIsLoading(true)
        try {
            await deletePlaygroundById(selectedProject.id)
            setDeleteDialogOpen(false)
            setSelectedProject(null)
            toast.success("Project deleted successfully!")
        } catch (error) {
            toast.error("Failed to delete project. Please try again.")
            console.error("Error deleting project:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDuplicateProject = async (project: Project) => {
        if (!project?.id) return
        setIsLoading(true)
        try {
            await duplicatePlaygroundById(project.id)
            toast.success("Project Duplicated successfully!")
        } catch (error) {
            toast.error("Failed to duplicate project. Please try again.")
            console.error("Error duplicating project:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const copyProjectUrl = (projectId: string) => {
        const url = `${window.location.origin}/playground/${projectId}`
        navigator.clipboard.writeText(url)
        toast.success("Project URL copied to clipboard!")
    }

    const handleToggleFavorite = async (project: Project) => {
        if (!project?.id) return
        setIsLoading(true)
        try {
            const updatedMark = await togglePlaygroundStarMark(project.id)
            toast.success(updatedMark.isMarked ? "Added to starred" : "Removed from starred")
            router.refresh()
        } catch (error) {
            toast.error("Failed to update starred state. Please try again.")
            console.error("Error toggling star mark:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const isProjectStarred = (project: Project) => project.starMark?.[0]?.isMarked ?? false

    // The dashboard list only contains projects from the signed-in user.
    // We use this fallback identity when project.user is missing.
    const displayUserName = currentUserName || "Unknown User"

    return (
        <>
            <div className="w-full border rounded-lg overflow-hidden bg-white dark:bg-[#151516]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Template</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead className="w-12.5">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Stagger row entry and cap delay so long tables still feel snappy. */}
                        {projects.map((project, index) => (
                            <TableRow
                                key={project.id}
                                className="opacity-0 [animation:reveal-up_520ms_ease-out_forwards]"
                                style={{ animationDelay: `${Math.min(index * 70, 350)}ms` }}
                            >
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <Link href={`/playground/${project.id}`} className="hover:underline">
                                            <span className="font-semibold">{project.title}</span>
                                        </Link>
                                        <span className="text-sm text-gray-500 line-clamp-1">{project.description}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
                                        {project.template}
                                    </Badge>
                                </TableCell>
                                <TableCell>{format(new Date(project.createdAt), "MMM d, yyyy")}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Avatar>
                                            <AvatarImage src={project.user?.image || currentUserImage || undefined} alt={project.user?.name || displayUserName} />
                                            <AvatarFallback>
                                                {(project.user?.name || displayUserName).charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm">{project.user?.name || displayUserName}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Open menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => handleToggleFavorite(project)} disabled={isLoading}>
                                                <Star className={`h-4 w-4 mr-2 ${isProjectStarred(project) ? "fill-current" : ""}`} />
                                                {isProjectStarred(project) ? "Remove from Starred" : "Add to Starred"}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/playground/${project.id}`} className="flex items-center">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Open Project
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/playground/${project.id}`} target="_blank" className="flex items-center">
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Open in New Tab
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleEditClick(project)}>
                                                <Edit3 className="h-4 w-4 mr-2" />
                                                Edit Project
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDuplicateProject(project)}>
                                                <Copy className="h-4 w-4 mr-2" />
                                                Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => copyProjectUrl(project.id)}>
                                                <Download className="h-4 w-4 mr-2" />
                                                Copy URL
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteClick(project)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Project
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Project Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>
                            Make changes to your project details here. Click save when you&apos;re done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Project Title</Label>
                            <Input
                                id="title"
                                value={editData.title}
                                onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="Enter project title"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={editData.description}
                                onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter project description"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleUpdateProject} disabled={isLoading || !editData.title.trim()}>
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{selectedProject?.title}&quot;? This action cannot be undone. All files and
                            data associated with this project will be permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteProject}
                            disabled={isLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isLoading ? "Deleting..." : "Delete Project"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default ProjectTable


