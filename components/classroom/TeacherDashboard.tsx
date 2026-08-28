"use client";

import { useState } from "react";
import type { ClassroomAssignment, TeacherFeedbackSuggestion } from "@/types/ngn";
import {
  Button,
  Card,
  Eyebrow,
  Meter,
  Pill,
  SectionHead,
  Stat,
} from "@/components/ui/primitives";
import { CLASSROOM } from "@/data/demo/classroom";
import { getDebate } from "@/data/demo/debates";
import { categoryLabel } from "@/lib/ai/debateJudge";
import { SCORE_CATEGORIES } from "@/types/ngn";

/**
 * Teacher dashboard.
 *
 * Two invariants that hold across every classroom surface:
 *  - AI feedback is a suggestion. Nothing here writes a grade; a teacher must
 *    accept, edit or ignore each one, and the label says so.
 *  - No analytics infer or display a student's political leaning. There is no
 *    "most Republican student" view because there is no field to build it from.
 */

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "assignments", label: "Assignments" },
  { id: "students", label: "Students" },
  { id: "create", label: "Create debate" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function TeacherDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const classroom = CLASSROOM;

  const participation = Math.round(
    classroom.students.reduce((sum, s) => sum + s.participationRate, 0) /
      classroom.students.length,
  );
  const avgArgument = Math.round(
    classroom.students.reduce((sum, s) => sum + s.averageArgumentScore, 0) /
      classroom.students.length,
  );
  const avgPerspective = Math.round(
    classroom.students.reduce((sum, s) => sum + s.averagePerspectiveScore, 0) /
      classroom.students.length,
  );
  const debatesCompleted = classroom.students.reduce(
    (sum, s) => sum + s.debatesCompleted,
    0,
  );
  const mostImproved = [...classroom.students].sort(
    (a, b) => b.improvement - a.improvement,
  )[0];

  return (
    <div>
      {/* Class header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <Eyebrow tone="accent">Classroom</Eyebrow>
          <h1 className="mt-2 text-2xl sm:text-3xl">{classroom.name}</h1>
          <p className="mt-1 text-sm text-ink-mute">{classroom.teacher}</p>
        </div>
        <div className="text-right">
          <p className="eyebrow text-ink-mute">Class code</p>
          <p className="tnum mt-1 text-xl font-semibold tracking-wider">
            {classroom.code}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            Students join with this code
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Classroom sections"
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-rule px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((option) => (
          <button
            key={option.id}
            role="tab"
            aria-selected={tab === option.id}
            onClick={() => setTab(option.id)}
            className={`relative shrink-0 px-3 py-3 text-sm font-medium transition-colors ${
              tab === option.id ? "text-ink" : "text-ink-mute hover:text-ink"
            }`}
          >
            {option.label}
            {tab === option.id && (
              <span aria-hidden className="absolute inset-x-3 -bottom-px h-[2px] bg-lime-deep" />
            )}
          </button>
        ))}
      </div>

      <div className="py-8">
        {tab === "overview" && (
          <div className="space-y-12">
            <section>
              <SectionHead title="Class analytics" />
              <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <Stat value={`${participation}%`} label="Participation" />
                <Stat value={avgArgument} label="Avg argument score" />
                <Stat value={avgPerspective} label="Avg perspective" tone="accent" />
                <Stat value={debatesCompleted} label="Debates completed" />
              </dl>

              <Card className="mt-6 p-5">
                <Eyebrow>Most improved</Eyebrow>
                <p className="mt-2 text-lg font-semibold">{mostImproved.displayName}</p>
                <p className="mt-1 text-sm text-ink-mute">
                  Argument score up {mostImproved.improvement} points since their
                  first debate this term.
                </p>
              </Card>
            </section>

            <section>
              <SectionHead
                title="Topic insights"
                description="Which categories the class finds hardest, averaged across every completed debate."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {SCORE_CATEGORIES.map((key, index) => (
                  <Meter
                    key={key}
                    value={72 + ((index * 7) % 18)}
                    label={categoryLabel(key)}
                    valueLabel={String(72 + ((index * 7) % 18))}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-sm border border-rule bg-paper-sunken/60 p-5">
              <h2 className="text-sm font-semibold">What this dashboard will never show</h2>
              <p className="mt-2 text-xs leading-relaxed text-ink-mute">
                NGN does not infer, store or display a student&apos;s political
                leaning, and no classroom analytic is derived from which side a
                student argued. There is no &ldquo;most conservative
                student&rdquo; view because there is no field it could be built
                from. Students are also frequently assigned sides they disagree
                with, so a transcript is not evidence of belief.
              </p>
            </section>
          </div>
        )}

        {tab === "assignments" && (
          <div className="space-y-8">
            {classroom.assignments.map((assignment) => (
              <AssignmentPanel key={assignment.id} assignment={assignment} />
            ))}
          </div>
        )}

        {tab === "students" && (
          <section>
            <SectionHead title="Students" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-rule-strong">
                    <th scope="col" className="py-3 font-medium text-ink-mute">Student</th>
                    <th scope="col" className="py-3 text-right font-medium text-ink-mute">Debates</th>
                    <th scope="col" className="py-3 text-right font-medium text-ink-mute">Argument</th>
                    <th scope="col" className="py-3 text-right font-medium text-ink-mute">Perspective</th>
                    <th scope="col" className="py-3 text-right font-medium text-ink-mute">Participation</th>
                    <th scope="col" className="py-3 text-right font-medium text-ink-mute">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {classroom.students.map((student) => (
                    <tr key={student.id} className="border-b border-rule">
                      <td className="py-3.5 font-medium">{student.displayName}</td>
                      <td className="tnum py-3.5 text-right text-ink-mute">{student.debatesCompleted}</td>
                      <td className="tnum py-3.5 text-right">{student.averageArgumentScore}</td>
                      <td className="tnum py-3.5 text-right">{student.averagePerspectiveScore}</td>
                      <td className="tnum py-3.5 text-right text-ink-mute">{student.participationRate}%</td>
                      <td className="tnum py-3.5 text-right font-semibold text-support">
                        +{student.improvement}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "create" && <CreateDebateForm />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function AssignmentPanel({ assignment }: { assignment: ClassroomAssignment }) {
  const debate = getDebate(assignment.debateSlug);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg">{assignment.title}</h2>
          <p className="mt-1 text-sm text-ink-mute">
            {debate?.title ?? assignment.debateSlug}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Pill>Due {assignment.dueAt}</Pill>
            <Pill>
              {assignment.sideAssignment === "teacher-assigned"
                ? "Teacher assigns sides"
                : assignment.sideAssignment === "random"
                  ? "Random sides"
                  : "Students choose sides"}
            </Pill>
            <Pill>
              {assignment.submitted} / {assignment.total} submitted
            </Pill>
          </div>
        </div>
      </div>

      {assignment.suggestions.length > 0 && (
        <div className="mt-6 border-t border-rule pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">AI Suggested Feedback</h3>
            <Pill tone="warn">Suggestion only — not a grade</Pill>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-mute">
            NGN never finalises a grade. Accept, edit or ignore each suggestion;
            nothing reaches a student until you do.
          </p>

          <ul className="mt-5 space-y-4">
            {assignment.suggestions.map((suggestion) => (
              <li key={suggestion.studentId}>
                <SuggestionCard suggestion={suggestion} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function SuggestionCard({ suggestion }: { suggestion: TeacherFeedbackSuggestion }) {
  const [status, setStatus] = useState(suggestion.status);
  const [comment, setComment] = useState(suggestion.suggestedComment);
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-sm border border-rule bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold">{suggestion.studentName}</span>
        {status !== "pending" && (
          <Pill tone={status === "ignored" ? "neutral" : "accent"}>
            {status === "accepted" ? "Accepted" : status === "edited" ? "Edited" : "Ignored"}
          </Pill>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
        {SCORE_CATEGORIES.map((key) => (
          <div key={key} className="flex justify-between gap-2 text-xs">
            <dt className="truncate text-ink-mute">{categoryLabel(key)}</dt>
            <dd className="tnum font-semibold">{suggestion.scores[key]}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-2 text-xs">
          <dt className="text-ink-mute">Participation</dt>
          <dd className="tnum font-semibold">{suggestion.scores.participation}</dd>
        </div>
      </dl>

      {editing ? (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="mt-4 w-full resize-y rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm leading-relaxed focus:border-ink focus:outline-none"
        />
      ) : (
        <p className="mt-4 border-l-2 border-rule pl-3 text-sm leading-relaxed text-ink-soft">
          {comment}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button
              size="sm"
              onClick={() => {
                setStatus("edited");
                setEditing(false);
              }}
            >
              Save and send
            </Button>
            <Button size="sm" tone="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={() => setStatus("accepted")}>
              Accept
            </Button>
            <Button size="sm" tone="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="sm" tone="ghost" onClick={() => setStatus("ignored")}>
              Ignore
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function CreateDebateForm() {
  const [sideAssignment, setSideAssignment] = useState<
    "random" | "student-choice" | "teacher-assigned"
  >("random");
  const [format, setFormat] = useState<"quick" | "standard" | "deep">("standard");
  const [created, setCreated] = useState(false);

  if (created) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h2 className="text-2xl">Class debate created</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-mute">
          Students in this class will see it on their next visit and are notified
          once. Results appear under Assignments with AI feedback suggestions for
          you to review.
        </p>
        <Button className="mt-6" tone="secondary" onClick={() => setCreated(false)}>
          Create another
        </Button>
      </div>
    );
  }

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setCreated(true);
      }}
    >
      <SectionHead
        title="Create a class debate"
        description="Private to this class. It does not appear in the public Arena and does not affect Arena Rating."
      />

      <label className="block">
        <span className="text-sm font-medium">Debate question</span>
        <input
          type="text"
          required
          placeholder="Should the voting age be lowered to 16?"
          className="mt-2 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3 text-sm placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Briefing</span>
        <textarea
          rows={5}
          placeholder="Neutral background students should read before debating. Both sides at equal strength."
          className="mt-2 w-full resize-y rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Assigned readings</span>
        <textarea
          rows={3}
          placeholder="One URL per line."
          className="mt-2 w-full resize-y rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Deadline</span>
          <input
            type="date"
            className="mt-2 h-11 w-full rounded-sm border border-rule bg-paper-raised px-3 text-sm focus:border-ink focus:outline-none"
          />
        </label>

        <fieldset>
          <legend className="text-sm font-medium">Format</legend>
          <div className="mt-2 flex gap-2">
            {(["quick", "standard", "deep"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFormat(option)}
                aria-pressed={format === option}
                className={`h-11 flex-1 rounded-sm border text-sm capitalize transition-colors ${
                  format === option
                    ? "border-ink bg-ink text-ink-inverse"
                    : "border-rule bg-paper-raised text-ink-soft hover:border-rule-strong"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Sides</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {[
            { id: "random" as const, label: "Random sides" },
            { id: "student-choice" as const, label: "Students choose" },
            { id: "teacher-assigned" as const, label: "You assign" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSideAssignment(option.id)}
              aria-pressed={sideAssignment === option.id}
              className={`h-11 rounded-sm border text-sm transition-colors ${
                sideAssignment === option.id
                  ? "border-ink bg-ink text-ink-inverse"
                  : "border-rule bg-paper-raised text-ink-soft hover:border-rule-strong"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          Assigned sides are labelled as assigned everywhere they appear, so a
          student&apos;s transcript is never read as a statement of their beliefs.
        </p>
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium">Rubric notes</span>
        <textarea
          rows={3}
          placeholder="What you want students to focus on. Shown to them before they write."
          className="mt-2 w-full resize-y rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
      </label>

      <div className="border-t border-rule pt-6">
        <Button type="submit" size="lg">
          Create class debate
        </Button>
      </div>
    </form>
  );
}
