import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { DECISION_CATEGORY_LABEL, type DecisionCategory } from "@readrep/domain";
import { getAssignContext } from "@/server/dal/review";
import { denyAsMissing } from "@/server/dal/guard";
import { AssignForm } from "@/components/coach/AssignForm";

export const metadata: Metadata = { title: "Assign" };
export const dynamic = "force-dynamic";

/** Route parameters are user input. Validate before anything reads them. */
const MomentIdParam = z.string().regex(/^[a-z0-9][a-z0-9_-]{2,63}$/);

export default async function AssignPage({
  params,
}: PageProps<"/coach/assign/[momentId]">) {
  const { momentId } = await params;
  const parsed = MomentIdParam.safeParse(momentId);
  if (!parsed.success) notFound();

  const context = await denyAsMissing(() => getAssignContext(parsed.data));
  if (!context) notFound();

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-10">
      <Link href="/coach/review" className="text-chalk-400 hover:text-chalk-50 text-sm">
        ← Review queue
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
        Assign this moment
      </h1>

      <div className="border-ink-700 bg-ink-850 mt-5 rounded-xl border p-4 sm:p-5">
        <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
          {DECISION_CATEGORY_LABEL[context.momentCategory as DecisionCategory] ??
            context.momentCategory}
        </p>
        <p className="text-chalk-50 mt-2 text-sm leading-relaxed">
          {context.momentCue}
        </p>
        <p className="text-chalk-500 mt-2 text-xs">
          From {context.ownerPlayerName}&apos;s film.
        </p>
      </div>

      <div className="mt-7">
        <AssignForm context={context} />
      </div>
    </div>
  );
}
