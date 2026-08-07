import React from "react";
import { Check } from "lucide-react";

export interface StepItem {
  id: number;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-zinc-800 -z-0" />
        {/* Active Progress Line */}
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-rose-600 transition-all duration-300 -z-0"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              onClick={() => onStepClick && isCompleted && onStepClick(step.id)}
              className={`flex flex-col items-center relative z-10 ${
                onStepClick && isCompleted ? "cursor-pointer" : ""
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 border-2 ${
                  isCompleted
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : isCurrent
                    ? "bg-white dark:bg-zinc-900 text-rose-600 border-rose-600 ring-4 ring-rose-100 dark:ring-rose-950/50"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border-slate-300 dark:border-zinc-700"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.id}
              </div>
              <span
                className={`mt-2 text-xs font-bold ${
                  isCurrent
                    ? "text-rose-600 dark:text-rose-400"
                    : isCompleted
                    ? "text-slate-900 dark:text-zinc-200"
                    : "text-slate-400 dark:text-zinc-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
