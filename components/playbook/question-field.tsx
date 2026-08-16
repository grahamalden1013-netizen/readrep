"use client";

import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import type { Question } from "@/lib/playbook/questions";

export type AnswerValue = { selections: string[]; customText: string | null };

/**
 * Chip used for single- and multi-select. Large tap target for mobile.
 * Reports the correct ARIA role for its question type: single-select is a
 * radio (one of many), multi-select is a checkbox (independent toggles).
 */
function Choice({
  label,
  selected,
  single,
  onClick,
}: {
  label: string;
  selected: boolean;
  single: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={single ? "radio" : "checkbox"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-left text-[13.5px] font-medium",
        "transition-[color,background-color,border-color,transform] duration-[var(--duration-fast)]",
        "active:scale-[0.98] motion-reduce:active:scale-100",
        selected
          ? "border-primary/50 bg-primary-soft text-primary-soft-foreground"
          : "border-border-strong bg-surface text-muted-foreground hover:border-border-strong hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center border",
          single ? "rounded-full" : "rounded",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border-strong",
        )}
        aria-hidden="true"
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

export function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: AnswerValue;
  onChange: (next: AnswerValue) => void;
}) {
  const { selections, customText } = value;

  function toggleMulti(option: string) {
    onChange({
      ...value,
      selections: selections.includes(option)
        ? selections.filter((s) => s !== option)
        : [...selections, option],
    });
  }

  function setSingle(option: string) {
    onChange({ ...value, selections: selections[0] === option ? [] : [option] });
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...selections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...value, selections: next });
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="flex flex-col gap-1">
        <span className="text-[16px] font-semibold leading-snug tracking-tight text-foreground">
          {question.label}
        </span>
        {question.help && (
          <span className="text-[13px] leading-relaxed text-muted-foreground">{question.help}</span>
        )}
      </legend>

      {(question.type === "single" || question.type === "multi") && question.options && (
        <div
          role={question.type === "single" ? "radiogroup" : "group"}
          aria-label={question.label}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {question.options.map((option) => (
            <Choice
              key={option}
              label={option}
              single={question.type === "single"}
              selected={selections.includes(option)}
              onClick={() =>
                question.type === "single" ? setSingle(option) : toggleMulti(option)
              }
            />
          ))}
        </div>
      )}

      {question.type === "rank" && question.options && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {question.options
              .filter((o) => !selections.includes(o))
              .map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange({ ...value, selections: [...selections, option] })}
                  className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-left text-[13.5px] font-medium text-muted-foreground transition-colors duration-[var(--duration-fast)] hover:border-primary/40 hover:bg-surface-2 hover:text-foreground active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  <Plus className="size-3.5 shrink-0" aria-hidden="true" />
                  {option}
                </button>
              ))}
          </div>

          {selections.length > 0 && (
            <ol className="flex flex-col gap-2">
              {selections.map((option, i) => (
                <li
                  key={option}
                  className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary-soft/40 px-3.5 py-2.5"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[13.5px] font-medium text-foreground">{option}</span>
                  <IconButton
                    label={`Move ${option} up`}
                    size="sm"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Move ${option} down`}
                    size="sm"
                    onClick={() => move(i, 1)}
                    disabled={i === selections.length - 1}
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Remove ${option}`}
                    size="sm"
                    onClick={() =>
                      onChange({ ...value, selections: selections.filter((s) => s !== option) })
                    }
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </IconButton>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {question.type === "text" && (
        <Input
          value={customText ?? ""}
          placeholder={question.placeholder}
          onChange={(e) => onChange({ ...value, customText: e.target.value })}
          aria-label={question.label}
        />
      )}

      {question.type === "longtext" && (
        <textarea
          value={customText ?? ""}
          placeholder={question.placeholder}
          rows={4}
          onChange={(e) => onChange({ ...value, customText: e.target.value })}
          aria-label={question.label}
          className="w-full rounded-md border border-border-strong bg-surface-2 px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-faint-foreground focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      )}

      {question.allowCustom && question.type !== "text" && question.type !== "longtext" && (
        <Input
          value={customText ?? ""}
          placeholder={question.customLabel ?? "Other — add your own"}
          onChange={(e) => onChange({ ...value, customText: e.target.value })}
          aria-label={question.customLabel ?? `Other, for: ${question.label}`}
        />
      )}
    </fieldset>
  );
}
