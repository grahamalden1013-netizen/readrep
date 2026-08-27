import { startDemoSession } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

/**
 * Shown when Supabase is not configured. This is an explicit demo session, not
 * a pretend login — it says so, and it only stores a display name.
 */
export function DemoSessionForm({ redirectTo }: { redirectTo: string }) {
  return (
    <div className="mt-8 rounded-[var(--radius-card)] border border-hairline bg-surface-2 p-5">
      <p className="eyebrow text-ink-3">Demo session</p>
      <p className="mt-2.5 text-[0.8125rem] leading-5 text-ink-2">
        This build ships without a Supabase project, so accounts cannot be
        created yet. Start a local demo session instead — it lets you react,
        comment and open the newsroom. It stores a display name in a cookie and
        nothing else.
      </p>

      <form action={startDemoSession} className="mt-4 space-y-3">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="space-y-1.5">
          <Label htmlFor="demo-name">Display name</Label>
          <Input
            id="demo-name"
            name="displayName"
            placeholder="Alex R."
            maxLength={40}
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" name="role" value="reader" variant="primary" size="sm">
            Continue as reader
          </Button>
          <Button type="submit" name="role" value="editor" variant="outline" size="sm">
            Continue as editor
          </Button>
        </div>
        <p className="text-[0.6875rem] text-ink-3">
          The editor session unlocks <span className="font-mono">/admin</span>,
          the newsroom dashboard.
        </p>
      </form>
    </div>
  );
}
