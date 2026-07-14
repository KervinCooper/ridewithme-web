import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-xs font-bold uppercase tracking-widest text-text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helperText ? helperId : undefined}
          className={cn(
            "h-11 w-full rounded-md border-2 border-border bg-surface-2 px-4 text-base text-text placeholder:text-text-muted outline-none transition-colors",
            "focus-visible:border-accent",
            error && "border-danger",
            className
          )}
          {...rest}
        />
        {(error || helperText) && (
          <p
            id={helperId}
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-danger" : "text-text-muted"
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
