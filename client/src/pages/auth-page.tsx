import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, Star } from "lucide-react";
import { insertUserSchema } from "@shared/schema";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = insertUserSchema
  .extend({ confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/* ── Field wrapper ── */
function Field({
  id, label, error, children,
}: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="label-caps text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) setLocation("/venues");
  }, [user, setLocation]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "user" },
  });

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* ═══ LEFT — Hero Panel ═══ */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-[hsl(220_18%_6%)]">
        {/* Background image overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=1200"
            alt="Theatre seating"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220_18%_6%)] via-[hsl(220_18%_8%)/80%] to-transparent" />
        </div>

        {/* Decorative corner lines */}
        <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-primary/30 z-10" />
        <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-primary/30 z-10" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="h-9 w-9 bg-primary/10 border border-primary/30 rounded flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-display font-bold text-foreground tracking-tight">QueueBuddy</span>
        </div>

        {/* Center copy */}
        <div className="relative z-10 space-y-6 max-w-sm">
          {/* Deco divider */}
          <div className="deco-divider text-primary/50">
            <Star className="h-3 w-3 fill-current" />
            RESERVE YOUR SEAT
            <Star className="h-3 w-3 fill-current" />
          </div>

          <h1 className="text-5xl font-display font-bold leading-tight text-foreground">
            The modern way to{" "}
            <span className="italic text-gradient-gold">claim your space.</span>
          </h1>

          <p className="text-base text-muted-foreground leading-relaxed">
            Real-time seat availability for workspaces, libraries, and study rooms — zero conflicts, no guesswork.
          </p>

          {/* Trust signals */}
          <div className="flex gap-6 pt-2">
            {[["500+", "Venues"], ["12k+", "Seats"], ["99.9%", "Uptime"]].map(([num, lbl]) => (
              <div key={lbl} className="text-center">
                <p className="text-xl font-display font-bold text-primary">{num}</p>
                <p className="text-xs label-caps">{lbl}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-muted-foreground/50">
          © 2024 QueueBuddy Inc. All rights reserved.
        </div>
      </div>

      {/* ═══ RIGHT — Auth Forms ═══ */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile logo */}
          <div className="flex flex-col items-center text-center mb-8 lg:hidden">
            <div className="h-12 w-12 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">QueueBuddy</h1>
            <p className="text-muted-foreground text-sm mt-1">Reserve your perfect spot</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            {/* Tabs List */}
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-card border border-border">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium"
              >
                Register
              </TabsTrigger>
            </TabsList>

            {/* ── LOGIN ── */}
            <TabsContent value="login">
              <div className="bg-card border border-border rounded-lg p-8 shadow-card ticket-notch">
                <div className="mb-6">
                  <h2 className="text-2xl font-display font-bold text-foreground">Welcome back</h2>
                  <p className="text-muted-foreground text-sm mt-1">Enter your credentials to continue</p>
                </div>
                <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} className="space-y-5">
                  <Field
                    id="login-email"
                    label="Email address"
                    error={loginForm.formState.errors.email?.message}
                  >
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      className="bg-background border-border focus:border-primary focus:ring-primary/20"
                      {...loginForm.register("email")}
                    />
                  </Field>
                  <Field
                    id="login-password"
                    label="Password"
                    error={loginForm.formState.errors.password?.message}
                  >
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-background border-border focus:border-primary focus:ring-primary/20"
                      {...loginForm.register("password")}
                    />
                  </Field>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-gold-glow mt-2"
                    type="submit"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                  {loginMutation.error && (
                    <p className="text-sm text-destructive text-center">{loginMutation.error.message}</p>
                  )}
                </form>
              </div>
            </TabsContent>

            {/* ── REGISTER ── */}
            <TabsContent value="register">
              <div className="bg-card border border-border rounded-lg p-8 shadow-card ticket-notch">
                <div className="mb-6">
                  <h2 className="text-2xl font-display font-bold text-foreground">Create account</h2>
                  <p className="text-muted-foreground text-sm mt-1">Join thousands of effortless reservers</p>
                </div>
                <form onSubmit={registerForm.handleSubmit((d) => { const { confirmPassword, ...rest } = d; registerMutation.mutate(rest); })} className="space-y-4">
                  <Field id="reg-name" label="Full name">
                    <Input
                      id="reg-name"
                      placeholder="Jane Smith"
                      className="bg-background border-border focus:border-primary focus:ring-primary/20"
                      {...registerForm.register("name")}
                    />
                  </Field>
                  <Field
                    id="reg-email"
                    label="Email address"
                    error={registerForm.formState.errors.email?.message}
                  >
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      className="bg-background border-border focus:border-primary focus:ring-primary/20"
                      {...registerForm.register("email")}
                    />
                  </Field>
                  <Field
                    id="reg-password"
                    label="Password"
                    error={registerForm.formState.errors.password?.message}
                  >
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="min 6 characters"
                      className="bg-background border-border focus:border-primary focus:ring-primary/20"
                      {...registerForm.register("password")}
                    />
                  </Field>
                  <Field
                    id="reg-confirm"
                    label="Confirm password"
                    error={registerForm.formState.errors.confirmPassword?.message}
                  >
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="••••••••"
                      className="bg-background border-border focus:border-primary focus:ring-primary/20"
                      {...registerForm.register("confirmPassword")}
                    />
                  </Field>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-gold-glow mt-2"
                    type="submit"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                  {registerMutation.error && (
                    <p className="text-sm text-destructive text-center">{registerMutation.error.message}</p>
                  )}
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
