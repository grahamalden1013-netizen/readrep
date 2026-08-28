import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { TeacherDashboard } from "@/components/classroom/TeacherDashboard";
import { RolePreview } from "@/components/shell/RolePreview";

export const metadata: Metadata = {
  title: "Classroom",
  description: "Teacher-led private debates, assignments and AI-suggested rubric feedback.",
};

export default function ClassroomPage() {
  return (
    <Container className="py-8 sm:py-12">
      <RolePreview requiredRole="teacher" surface="classroom" />
      <TeacherDashboard />
    </Container>
  );
}
