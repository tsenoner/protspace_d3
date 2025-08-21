"use client";

import type * as React from "react";

interface ModeToggleButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

export function ModeToggleButton({
  active,
  disabled = false,
  onClick,
  title,
  children,
}: ModeToggleButtonProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type="button"
      className={`px-3 py-1 rounded-md flex items-center space-x-1 ${
        active
          ? "bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary-700)] border border-transparent"
          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      title={title}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}



