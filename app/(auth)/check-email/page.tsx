import { MailCheck } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full max-w-sm rr-animate-in">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <MailCheck className="size-5.5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold tracking-tight text-foreground">
                Check your email
              </h1>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                We sent you a confirmation link. Click it to activate your
                account, then log in.
              </p>
            </div>
            <LinkButton href="/login" variant="secondary" size="sm" className="mt-1">
              Back to log in
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
