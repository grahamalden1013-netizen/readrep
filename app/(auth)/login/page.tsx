import { login } from "../actions";
import { LinkButton, Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export default async function LoginPage({
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
            <CardTitle className="text-[19px]">Welcome back</CardTitle>
            <CardDescription>Log in to your ReadRep account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={login} className="flex flex-col gap-4">
              {error && <Alert tone="danger">{error}</Alert>}

              <Field label="Email">
                {(id) => <Input id={id} type="email" name="email" required autoComplete="email" />}
              </Field>

              <Field label="Password">
                {(id) => (
                  <Input
                    id={id}
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                  />
                )}
              </Field>

              <Button type="submit" className="mt-1 w-full">
                Log in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-[13.5px] text-muted-foreground">
          No account?{" "}
          <LinkButton
            href="/signup"
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0 text-primary hover:bg-transparent hover:text-primary-hover"
          >
            Sign up
          </LinkButton>
        </p>
      </div>
    </div>
  );
}
