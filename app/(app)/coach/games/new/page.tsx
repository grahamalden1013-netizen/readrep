import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { createGame } from "../../actions";

export default async function NewGamePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  if (!profile.team_id) {
    redirect("/coach");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <PageHeader
        title="Upload a game"
        subtitle="Give it a title and a link to the film — ReadRep will use it to build a session."
      />

      <Card>
        <CardContent className="py-6">
          <form action={createGame} className="flex flex-col gap-4">
            {error && <Alert tone="danger">{error}</Alert>}
            <input type="hidden" name="team_id" value={profile.team_id} />

            <Field label="Game title" hint="e.g. vs. Wildcats, 11/14">
              {(id) => <Input id={id} type="text" name="title" required autoFocus />}
            </Field>

            <Field label="Video URL" hint="A direct link to the game film.">
              {(id) => (
                <Input id={id} type="url" name="video_url" placeholder="https://" required />
              )}
            </Field>

            <Button type="submit" className="mt-1 self-start">
              Add game
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
