import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="text-sm text-zinc-600">
          We sent you a confirmation link. Click it to activate your account,
          then log in.
        </p>
        <Link href="/login" className="text-sm font-medium underline">
          Back to log in
        </Link>
      </div>
    </div>
  );
}
