"use client";

export type ProcessStep = { label: string; status: "running" | "done" };

interface Props {
  steps: ProcessStep[];
  isLoading: boolean;
}

export function StatusIndicator({ steps, isLoading }: Props) {
  if (steps.length === 0) return null;

  return (
    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 space-y-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          {step.status === "running" ? (
            <div className="w-3 h-3 border-2 border-tum-blue border-t-transparent rounded-full animate-spin flex-shrink-0" />
          ) : (
            <svg
              className="w-3 h-3 text-green-500 flex-shrink-0"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="2,6 5,9 10,3" />
            </svg>
          )}
          <span
            className={`text-xs font-medium transition-colors duration-200 truncate ${
              step.status === "done" ? "text-gray-400" : "text-tum-blue"
            }`}
          >
            {step.label}
          </span>
        </div>
      ))}
      {!isLoading && steps.length > 0 && (
        <div className="flex items-center gap-2 pt-0.5">
          <div className="w-3 h-3 flex-shrink-0" />
          <span className="text-xs text-gray-400 italic">Done</span>
        </div>
      )}
    </div>
  );
}
