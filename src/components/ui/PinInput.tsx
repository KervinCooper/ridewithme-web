"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function PinInput({
  length = 4,
  value,
  onChange,
  onComplete,
  label,
  error,
  disabled,
  autoFocus,
}: PinInputProps) {
  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function setDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    const nextValue = next.join("").slice(0, length);
    onChange(nextValue);
    if (nextValue.length === length) onComplete?.(nextValue);
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, digit);
    if (digit && index < length - 1) {
      boxRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      boxRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const nextValue = pasted.slice(0, length);
    onChange(nextValue);
    if (nextValue.length === length) onComplete?.(nextValue);
    boxRefs.current[Math.min(nextValue.length, length - 1)]?.focus();
  }

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-text-muted">
          {label}
        </label>
      )}
      <div className="flex gap-2" role="group" aria-label={label ?? "PIN"}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              boxRefs.current[index] = el;
            }}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoFocus={autoFocus && index === 0}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            aria-label={`${label ?? "PIN"} digit ${index + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            className={cn(
              "h-14 w-full min-w-0 rounded-md border-2 border-border bg-surface-2 text-center font-mono text-2xl font-bold text-text outline-none transition-colors",
              "focus-visible:border-accent",
              error && "border-danger",
              disabled && "opacity-50"
            )}
          />
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
