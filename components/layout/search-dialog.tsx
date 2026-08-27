"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SEARCH_SUGGESTIONS } from "@/lib/content/repository";
import { cn } from "@/lib/utils";

export function SearchDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (typing) return;
      if (event.key === "/" || (event.key === "k" && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setOpen(false);
    setQuery("");
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search NGN"
        className={cn(
          "grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink",
          className,
        )}
      >
        <Search className="size-[1.05rem]" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[18%] max-w-xl -translate-y-0 p-0" showClose={false}>
          <DialogTitle className="sr-only">Search NGN</DialogTitle>
          <DialogDescription className="sr-only">
            Search articles, issue guides, Weekly editions and discussions.
          </DialogDescription>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              go(query);
            }}
            className="flex items-center gap-3 border-b border-hairline px-5"
          >
            <Search className="size-4 shrink-0 text-ink-3" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search stories, issues, terms..."
              aria-label="Search query"
              className="h-14 w-full bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-3"
            />
            <kbd className="hidden rounded border border-hairline px-1.5 py-0.5 font-mono text-[0.625rem] text-ink-3 sm:block">
              Esc
            </kbd>
          </form>
          <div className="p-5">
            <p className="eyebrow text-ink-3">Try asking</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SEARCH_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => go(suggestion)}
                  className="rounded-full border border-hairline px-3 py-1.5 text-[0.8125rem] text-ink-2 transition-colors hover:border-hairline-strong hover:bg-surface-2 hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
