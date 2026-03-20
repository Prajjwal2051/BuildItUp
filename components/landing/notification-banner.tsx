"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function NotificationBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full px-6 md:px-10 max-w-[1440px] mx-auto">
      <div
        className="rounded-xl flex items-center justify-between px-4 py-3 border"
        style={{ backgroundColor: "#161616", borderColor: "#2e2e2e" }}
      >
        <div className="flex items-center gap-4 text-[14px] text-neutral-400">
          <span
            className="px-3 py-1 rounded-[6px] font-bold text-[11px] tracking-wide uppercase"
            style={{ backgroundColor: "#a4f0d6", color: "#000" }}
          >
            New
          </span>
          Introduction to metabox v.2 Vue Js can be run through the media browser
        </div>
        <button
          id="close-banner"
          onClick={() => setVisible(false)}
          className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
          aria-label="Close banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
