"use client";

import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import { useState } from "react"
import TemplateSelectionModal from "./template-selecting-model"
import { useRouter } from "next/navigation"
import { createPlayground } from "../actions"
import { toast } from "sonner"

const AddNewButton = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate,setSelectedTemplate] = useState<{
        title: string,
        template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "ANGULAR" | "HONO",
        description?: string
    } | null>(null)
    const router = useRouter();
    
    const handleSubmit= async(data:{
        title: string,
        template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "ANGULAR" | "HONO",
        description?: string
    })=>{
        setSelectedTemplate(data)
        const res=await createPlayground(data)
        if(!res){
            // Handle error case, maybe show a toast notification
            toast.error("Failed to create playground. Please try again.")
            return;
        }
        toast.success("Playground created successfully!")
        setIsModalOpen(false)
        router.push(`/playground/${res?.id}`)
    }

    return (
        <>
            <Button
                onClick={() => setIsModalOpen(true)}
                size="sm"
                className="h-8 px-2.5 gap-1.5 border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                <Plus size={14} />
                <span className="text-xs font-semibold">Add New Project</span>
            </Button>
            {/* Modal content can be added here in the future */}
            <TemplateSelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit}/>
        </>
    )
}

export default AddNewButton
