import { signup } from "../actions";
import { LinkButton, Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rr-animate-in">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <Card>
          <CardHeader className="flex-col items-start">
            <CardTitle className="text-[19px]">Create your account</CardTitle>
            <CardDescription>Coaches and players start here.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signup} className="flex flex-col gap-4">
              {error && <Alert tone="danger">{error}</Alert>}

              <fieldset className="flex flex-col gap-1.5">
                <legend className="text-[13px] font-medium text-foreground">I&apos;m a...</legend>
                <div className="grid grid-cols-2 gap-1.5 rounded-md bg-surface-2 p-1">
                  {(["player", "coach"] as const).map((role) => (
                    <label key={role} className="relative">
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        required
                        defaultChecked={role === "player"}
                        className="peer sr-only"
                      />
                      <span className="flex h-9 cursor-pointer items-center justify-center rounded-[7px] text-[13.5px] font-medium capitalize text-muted-foreground transition-colors peer-checked:bg-surface peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
                        {role}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <Field label="Full name">
                {(id) => (
                  <Input id={id} type="text" name="full_name" required autoComplete="name" />
                )}
              </Field>

              <Field
                label="Team invite code"
                hint="Players only — ask your coach. You can also add this later."
                optional
              >
                {(id) => (
                  <Input
                    id={id}
                    type="text"
                    name="invite_code"
                    className="uppercase"
                    autoComplete="off"
                  />
                )}
              </Field>

              <Field label="Email">
                {(id) => (
                  <Input id={id} type="email" name="email" required autoComplete="email" />
                )}
              </Field>

              <Field label="Password" hint="At least 8 characters.">
                {(id) => (
                  <Input
                    id={id}
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                )}
              </Field>

              <Button type="submit" className="mt-1 w-full">
                Sign up
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-[13.5px] text-muted-foreground">
          Already have an account?{" "}
          <LinkButton
            href="/login"
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0 text-primary hover:bg-transparent hover:text-primary-hover"
          >
            Log in
          </LinkButton>
        </p>
      </div>
    </div>
  );
}
