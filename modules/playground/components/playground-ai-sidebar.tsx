'use client'

import { Bot, X } from 'lucide-react'

interface PlaygroundAiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Shows the right-side AI chat area when enabled from the AI dropdown.
function PlaygroundAiSidebar({ isOpen, onClose }: PlaygroundAiSidebarProps) {
  if (!isOpen) return null

  return (
    <aside className="flex h-full w-85 shrink-0 flex-col border-l border-[#1c1f26] bg-[#0b0d11]">
      <div className="flex items-center justify-between border-b border-[#1c1f26] px-3 py-2">
        <div className="flex items-center gap-2 text-[12px] text-[#aab1bf]">
          <Bot size={14} />
          <span className="font-medium">AI Chat</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[#71798a] hover:bg-[#151922] hover:text-white"
          aria-label="Close AI chat sidebar"
          title="Close AI chat sidebar"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 px-3 py-3 text-[12px] text-[#7d8596]">
        AI chat sidebar is open. Connect your chat component here.
      </div>
    </aside>
  )
}

export default PlaygroundAiSidebar
