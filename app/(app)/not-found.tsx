import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";

/**
 * Scoped to the app segment so it renders inside the app shell rather than
 * stacking a second header under the root layout's one.
 */
export default function AppNotFound() {
  return (
    <div className="page-shell-narrow flex flex-1 flex-col justify-center gap-6 py-20">
      <PageHeader
        label="404"
        title="Nothing here"
        actions={<ButtonLink href="/dashboard">Back to dashboard</ButtonLink>}
      >
        That page or session does not exist. Sessions are kept on this device, so a link opened
        somewhere else will not find one.
      </PageHeader>
    </div>
  );
}
