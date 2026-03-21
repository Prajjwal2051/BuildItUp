"use client";

import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import { useState } from "react"
import TemplateSelectionModal from "./template-selecting-model"

const AddNewButton = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

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
            <TemplateSelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={() => (false)} />
        </>
    )
}

export default AddNewButton
