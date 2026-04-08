'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import TemplateSelectionModal from './template-selecting-model'
import { useRouter } from 'next/navigation'
import { createPlayground } from '../actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const AddNewButton = ({ className }: { className?: string }) => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const router = useRouter()

    const handleSubmit = async (data: {
        title: string
        template: 'REACT' | 'NEXTJS' | 'EXPRESS' | 'VUE' | 'ANGULAR' | 'HONO'
        description?: string
    }) => {
        const res = await createPlayground(data)
        if (!res) {
            // Handle error case, maybe show a toast notification
            toast.error('Failed to create playground. Please try again.')
            return
        }
        toast.success('Playground created successfully!')
        setIsModalOpen(false)
        router.push(`/playground/${res?.id}`)
    }

    return (
        <>
            <Button
                onClick={() => setIsModalOpen(true)}
                size="sm"
                className={cn(
                    'h-11 gap-2 rounded-lg border px-4 text-sm font-medium shadow-sm transition-colors',
                    'border-slate-300 bg-[#f9f6ee] text-slate-900 hover:bg-[#f4efe3] hover:text-slate-950', // Light mode
                    'dark:border-white/10 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 dark:hover:text-slate-950', // Dark mode
                    className,
                )}
            >
                <Plus size={14} />
                <span>Add New Project</span>
            </Button>
            {/* Modal content can be added here in the future */}
            <TemplateSelectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
            />
        </>
    )
}

export default AddNewButton
