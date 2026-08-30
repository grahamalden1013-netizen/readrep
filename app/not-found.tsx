import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { Wordmark } from "@/components/wordmark";

export default function NotFound() {
  return (
    <div className="is-document shell-app flex flex-1 flex-col">
      <header className="border-b border-line">
        <div className="page-shell flex h-14 items-center">
          <Wordmark href="/dashboard" />
        </div>
      </header>
      <div className="page-shell-narrow flex flex-1 flex-col justify-center gap-6 py-20">
        <PageHeader
          label="404"
          title="Nothing here"
          actions={<ButtonLink href="/dashboard">Back to dashboard</ButtonLink>}
        >
          That page or session does not exist. Sessions are kept on this device, so an old link can
          expire.
        </PageHeader>
      </div>
    </div>
  );
}
