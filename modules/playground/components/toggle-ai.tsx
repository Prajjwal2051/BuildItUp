'use client'

import { Bot } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface ToggleAiProps {
    isAiAutocompleteEnabled: boolean
    isAiChatOpen: boolean
    onToggleAutocomplete: (enabled: boolean) => void
    onOpenChat: () => void
    onCloseChat: () => void
}

// Renders the AI button dropdown with controls for autocomplete and chat sidebar visibility.
function ToggleAi({
    isAiAutocompleteEnabled,
    isAiChatOpen,
    onToggleAutocomplete,
    onOpenChat,
    onCloseChat,
}: ToggleAiProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition-colors',
                        isAiAutocompleteEnabled || isAiChatOpen
                            ? 'border-[#0f4d40] bg-[rgba(0,212,170,0.12)] text-[#7ae8cc]'
                            : 'border-[#1e2028] bg-[#11161d] text-[#c9d4e5] hover:border-[#00d4aa]/30 hover:text-white',
                    )}
                    title="Ollama AI options"
                >
                    <Bot
                        size={13}
                        className={
                            isAiAutocompleteEnabled || isAiChatOpen
                                ? 'text-[#00d4aa]'
                                : 'text-[#7aa7b3]'
                        }
                    />
                    <span>AI</span>
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-64 border-[#1e2028] bg-[#11161d] text-[#c9d4e5]"
            >
                <div className="px-2 py-1.5 text-[11px] font-medium text-[#6a7280]">
                    Ollama AI Options
                </div>

                <DropdownMenuItem
                    onSelect={(event) => event.preventDefault()}
                    className="flex items-center justify-between gap-3 text-[#c9d4e5] focus:bg-[rgba(0,212,170,0.08)] focus:text-white"
                >
                    <span>Ollama Autocomplete</span>
                    <Switch
                        checked={isAiAutocompleteEnabled}
                        onCheckedChange={onToggleAutocomplete}
                        aria-label="Toggle Ollama autocomplete"
                    />
                </DropdownMenuItem>

                <DropdownMenuItem
                    onSelect={onOpenChat}
                    className="text-[#c9d4e5] focus:bg-[rgba(0,212,170,0.08)] focus:text-white"
                >
                    Open AI Chat Sidebar
                </DropdownMenuItem>

                {isAiChatOpen ? (
                    <DropdownMenuItem
                        onSelect={onCloseChat}
                        className="text-[#c9d4e5] focus:bg-[rgba(0,212,170,0.08)] focus:text-white"
                    >
                        Hide AI Chat Sidebar
                    </DropdownMenuItem>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default ToggleAi
