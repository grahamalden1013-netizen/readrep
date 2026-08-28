import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { ProfileView } from "@/components/arena/ProfileView";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your Arena Rating, argument profile, badges and debate record.",
};

export default function ProfilePage() {
  return (
    <Container className="py-10 sm:py-14">
      <ProfileView />
    </Container>
  );
}
