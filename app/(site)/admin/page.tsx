import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/primitives";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { RolePreview } from "@/components/shell/RolePreview";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <>
      <PageHeader
        eyebrow="Internal"
        title="Admin"
        lede="Newsroom, debates, sources and moderation. No AI-generated political content publishes without human review."
      />
      <Container className="py-8 sm:py-12">
        <RolePreview requiredRole="admin" surface="admin console" />
        <AdminConsole />
      </Container>
    </>
  );
}
