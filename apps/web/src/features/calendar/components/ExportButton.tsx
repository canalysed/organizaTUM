"use client";

export function ExportButton() {
  const handleExport = () => {
    window.open("/api/calendar/export", "_blank");
  };

  return (
    <button
      onClick={handleExport}
      className="text-xs text-tum-blue border border-tum-blue rounded-lg px-3 py-1 hover:bg-tum-blue/10 transition-colors"
    >
      Export .ics
    </button>
  );
}
