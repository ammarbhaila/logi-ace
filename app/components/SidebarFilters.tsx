"use client";

import { useState } from "react";

type Group = {
  id: string;
  label: string;
  options: string[];
};

const GROUPS: Group[] = [
  { id: "form", label: "Form Factors", options: ["Notebooks", "2in1", "Desktop"] },
  { id: "cpu", label: "Processors", options: ["Intel Core i7", "Intel Core i5", "Intel Core Ultra 7", "Intel Core Ultra 5", "Snapdragon X Elite", "Snapdragon X Plus", "Snapdragon X"] },
  { id: "memory", label: "Memory", options: ["16GB", "32GB"] },
];

export default function SidebarFilters() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    GROUPS.forEach((g) => (map[g.id] = true));
    return map;
  });

  const [selected, setSelected] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    GROUPS.forEach((g) => (map[g.id] = new Set()));
    return map;
  });

  function toggleGroup(id: string) {
    setOpenGroups((s) => ({ ...s, [id]: !s[id] }));
  }

  function toggleOption(groupId: string, option: string) {
    setSelected((s) => {
      const next = { ...s };
      const set = new Set(next[groupId]);
      if (set.has(option)) set.delete(option);
      else set.add(option);
      next[groupId] = set;
      return next;
    });
  }

  return (
    <aside className="w-full max-w-xs">
      <div className="space-y-4">
        {GROUPS.map((g) => (
          <div key={g.id} className="bg-white border rounded-md">
            <button
              onClick={() => toggleGroup(g.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
            >
              <span>{g.label}</span>
              <span className="text-gray-500">{openGroups[g.id] ? "−" : "+"}</span>
            </button>

            {openGroups[g.id] && (
              <div className="px-4 pb-3 pt-0">
                {g.options.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selected[g.id].has(opt)}
                      onChange={() => toggleOption(g.id, opt)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
