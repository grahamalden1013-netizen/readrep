import { logout } from "@/app/(auth)/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        Log out
      </button>
    </form>
  );
}
