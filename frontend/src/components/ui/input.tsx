import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
    )}
    <input
      ref={ref}
      id={id}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary",
        error && "border-destructive focus-visible:ring-destructive",
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
));
Input.displayName = "Input";
