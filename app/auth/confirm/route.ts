import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, homePathForRole } from "@/lib/profile/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const inviteCode = user?.user_metadata?.invite_code as
        | string
        | undefined;

      if (inviteCode) {
        // Best-effort: an invalid/missing code just leaves the player
        // without a team, which they can retry from their dashboard.
        await supabase.rpc("join_team_by_code", { code: inviteCode });
      }

      const profile = await getCurrentProfile();
      redirect(profile ? homePathForRole(profile.role) : "/dashboard");
    }
  }

  redirect(`/login?error=${encodeURIComponent("Could not verify email")}`);
}
