"use client";

import type { TimeBlock } from "@organizaTUM/shared";
import { useCalendarStore } from "@/stores/calendar-store";

interface Props {
  block: TimeBlock;
}

export function BlockEditor({ block }: Props) {
  const selectBlock = useCalendarStore((s) => s.selectBlock);

  return (
    <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">
          Editing: {block.title}
        </span>
        <button
          onClick={() => selectBlock(null)}
          className="text-gray-400 hover:text-gray-600 text-xs"
        >
          ✕
        </button>
      </div>
      <p className="text-xs text-gray-400">
        {/* TODO: wire to chat — pre-fill ChatInput with "Change [block] to..." */}
        Click a block to request changes via chat.
      </p>
    </div>
  );
}
