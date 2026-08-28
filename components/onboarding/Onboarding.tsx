"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, GradeBand } from "@/types/ngn";
import { CATEGORIES } from "@/types/ngn";
import { useArena, suggestUsername } from "@/components/providers/ArenaProvider";
import { Button, Eyebrow } from "@/components/ui/primitives";
import { track } from "@/lib/analytics";

/**
 * Onboarding.
 *
 * One required field: a username. Everything else is optional and says so.
 * A large share of NGN's users are minors, so the design principle is that the
 * safest field is the one we do not ask for — there is no birthday, no precise
 * location and no ideology question anywhere in this flow.
 */

const GRADE_BANDS: GradeBand[] = ["6-8", "9-10", "11-12", "College", "Educator"];

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export function Onboarding() {
  const router = useRouter();
  const { ready, profile, completeOnboarding } = useArena();

  const [username, setUsername] = useState(profile?.username ?? "");
  const [interests, setInterests] = useState<Category[]>(profile?.interests ?? []);
  const [gradeBand, setGradeBand] = useState<GradeBand | null>(profile?.gradeBand ?? null);
  const [school, setSchool] = useState(profile?.school ?? "");
  const [usState, setUsState] = useState(profile?.state ?? "");

  const handle = username.trim() || (ready ? "" : "");

  function toggleInterest(category: Category) {
    setInterests((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  }

  function finish() {
    const finalName = handle || suggestUsername();
    completeOnboarding({
      username: finalName,
      interests,
      gradeBand,
      school: school.trim() || null,
      state: usState || null,
    });
    track("signup_completed", { interests: interests.length });
    router.push("/arena");
  }

  return (
    <div className="space-y-10">
      {/* Username — the only required field */}
      <section>
        <Eyebrow tone="accent">Required</Eyebrow>
        <h2 className="mt-2 text-2xl">Pick a username</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-mute">
          This is the only name anyone on NGN will see. Do not use your full
          real name.
        </p>
        <div className="mt-4 flex max-w-md flex-wrap gap-2">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.slice(0, 24))}
            maxLength={24}
            placeholder="e.g. warrant204"
            className="h-11 min-w-0 flex-1 rounded-sm border border-rule bg-paper-raised px-3 text-sm focus:border-ink focus:outline-none"
          />
          <Button
            tone="secondary"
            onClick={() => setUsername(suggestUsername())}
          >
            Suggest one
          </Button>
        </div>
      </section>

      {/* Interests */}
      <section className="border-t border-rule pt-8">
        <Eyebrow>Optional</Eyebrow>
        <h2 className="mt-2 text-2xl">What topics interest you?</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-mute">
          Used to order which debates you are shown first. Not a political
          question, and it changes nothing about how you are scored.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const active = interests.includes(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleInterest(category)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-ink bg-ink text-ink-inverse"
                    : "border-rule-strong bg-paper-raised text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      {/* Optional details */}
      <section className="border-t border-rule pt-8">
        <Eyebrow>Optional — leave blank if you prefer</Eyebrow>
        <h2 className="mt-2 text-2xl">A few details</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-mute">
          Only used for school and state leaderboards. NGN never asks for your
          birthday, your address or your precise location.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-medium">Grade range</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {GRADE_BANDS.map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => setGradeBand(gradeBand === band ? null : band)}
                  aria-pressed={gradeBand === band}
                  className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${
                    gradeBand === band
                      ? "border-ink bg-paper-sunken font-medium"
                      : "border-rule bg-paper-raised text-ink-soft hover:border-rule-strong"
                  }`}
                >
                  {band}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-sm font-medium">State</span>
            <select
              value={usState}
              onChange={(e) => setUsState(e.target.value)}
              className="mt-2 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3 text-sm focus:border-ink focus:outline-none"
            >
              <option value="">Prefer not to say</option>
              {STATES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">School</span>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value.slice(0, 80))}
              placeholder="Prefer not to say"
              className="mt-2 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3 text-sm placeholder:text-ink-faint focus:border-ink focus:outline-none"
            />
          </label>
        </div>
      </section>

      <div className="border-t border-rule pt-8">
        <Button size="lg" onClick={finish} disabled={!handle}>
          Go to the Arena
        </Button>
        <p className="mt-3 text-xs text-ink-faint">
          You can change or delete any of this later from your profile.
        </p>
      </div>
    </div>
  );
}
