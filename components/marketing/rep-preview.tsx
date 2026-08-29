import Image from "next/image";
import { SKILL_CATEGORY_LABELS } from "@/lib/reps/schema";
import { DEMO_GAME, DEMO_REPS } from "@/lib/reps/seed";

/**
 * A non-interactive still of the rep screen. Uses the real seeded rep so the
 * landing page shows the actual product rather than an invented mockup.
 */
export function RepPreview() {
  const rep = DEMO_REPS[0];
  const poster = DEMO_GAME.video?.posterSrc;

  return (
    <figure className="overflow-hidden rounded-panel border border-ink-700 bg-ink-900">
      <div className="grid lg:grid-cols-3">
        <div className="relative aspect-video bg-ink-950 lg:col-span-2">
          {poster ? (
            <Image
              src={poster}
              alt="Still from the demo film, paused with #22 on the right wing as the Dragons’ low defender digs down to the post, leaving the weak-side corner open."
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
              priority
            />
          ) : null}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="label-caps rounded-sm bg-ink-950/85 px-2 py-1 text-ink-100">
              Rep 1 of 5
            </span>
            <span className="label-caps rounded-sm bg-lime-accent px-2 py-1 text-ink-950">
              {SKILL_CATEGORY_LABELS[rep.category]}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-ink-700 p-6 lg:border-t-0 lg:border-l">
          <p className="text-[0.9375rem] leading-relaxed font-medium text-ink-50">{rep.prompt}</p>
          <ul className="flex flex-col gap-2">
            {rep.choices.map((choice, index) => (
              <li
                key={choice.id}
                className="flex items-center gap-3 rounded-panel border border-ink-700 px-3 py-2.5 text-sm text-ink-200"
              >
                <span className="font-mono text-xs text-ink-500">
                  {String.fromCharCode(65 + index)}
                </span>
                {choice.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption className="border-t border-ink-700 px-6 py-3 text-xs text-ink-500">
        A real rep from the demo game. The film is an animated re-creation, not game footage.
      </figcaption>
    </figure>
  );
}
