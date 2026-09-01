import { redirect } from "next/navigation";

/**
 * The manual clip studio is the advanced path now — kept available, not the
 * default post-upload destination. This route is the stable entry point the
 * analysis and review screens link to; Studio itself still lives at /studio.
 */
export default async function AdvancedRedirect({ params }: PageProps<"/games/[gameId]/advanced">) {
  const { gameId } = await params;
  redirect(`/studio/${gameId}`);
}
