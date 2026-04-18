"use client";

import type { FormEvent, ChangeEvent } from "react";

interface Props {
  input: string;
  onInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function ChatInput({ input, onInputChange, onSubmit, isLoading }: Props) {
  return (
    <form onSubmit={onSubmit} className="px-4 py-3 border-t border-gray-200">
      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={onInputChange}
          placeholder="Type a message..."
          rows={1}
          disabled={isLoading}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tum-blue focus:border-transparent disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-tum-blue text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-tum-blue-dark disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  );
}
