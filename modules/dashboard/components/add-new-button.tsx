"use client";

import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import { useState } from "react"

const AddNewButton = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <Button
                onClick={() => setIsModalOpen(true)}
                size="sm"
                className="h-8 px-2.5 gap-1.5 border border-[#010101] bg-[#ffffff] text-[#010101] hover:bg-[#95e8ae] hover:text-[#080107] transition-colors"
            >
                <Plus size={14} />
                <span className="text-xs font-semibold">Add New Project</span>
            </Button>
            {/* Modal content can be added here in the future */}
        </>
    )
}

export default AddNewButton
