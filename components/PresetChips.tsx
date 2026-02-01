"use client";

const PRESETS = [
  "Tell me about yourself",
  "Superpower",
  "Why 100x?",
  "Growth areas",
  "Philosophy on AI",
];

export default function PresetChips({
  onSelect,
}: {
  onSelect: (text: string) => void;
}) {
  return (
    <div className="preset-chips">
      {PRESETS.map((p) => (
        <button
          key={p}
          className="preset-chip"
          onClick={() => onSelect(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
