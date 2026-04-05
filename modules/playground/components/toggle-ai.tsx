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
              ? 'border-[#61afef] bg-[#1b2130] text-[#dbe8ff]'
              : 'border-[#2a2f3a] bg-[#141821] text-[#aab1bf] hover:border-[#3a4150] hover:text-white',
          )}
          title="AI options"
        >
          <Bot size={13} />
          <span>AI</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">AI Options</div>

        <DropdownMenuItem
          onSelect={(event) => event.preventDefault()}
          className="flex items-center justify-between gap-3"
        >
          <span>Auto Completion</span>
          <Switch
            checked={isAiAutocompleteEnabled}
            onCheckedChange={onToggleAutocomplete}
            aria-label="Toggle AI auto completion"
          />
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onOpenChat}>Open AI Chat Sidebar</DropdownMenuItem>

        {isAiChatOpen ? (
          <DropdownMenuItem onSelect={onCloseChat}>Hide AI Chat Sidebar</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ToggleAi
