"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="musa-sublabel"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-11 px-3.5 bg-surface-raised border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle transition-all duration-[160ms] outline-none",
            "focus:border-border-focus focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]",
            "disabled:bg-surface-sunken disabled:text-on-surface-disabled disabled:cursor-not-allowed",
            error && "border-error focus:border-error focus:shadow-[0_0_0_3px_rgba(155,35,53,0.10)]",
            className
          )}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helper
              ? `${inputId}-helper`
              : undefined
          }
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="font-ui text-[12px] text-error"
            role="alert"
          >
            {error}
          </p>
        )}
        {helper && !error && (
          <p
            id={`${inputId}-helper`}
            className="font-ui text-[12px] text-on-surface-subtle"
          >
            {helper}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="musa-sublabel"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle transition-all duration-[160ms] outline-none resize-none",
            "focus:border-border-focus focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]",
            error && "border-error",
            className
          )}
          {...props}
        />
        {error && (
          <p className="font-ui text-[12px] text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
