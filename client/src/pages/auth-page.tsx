import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, Eye, EyeOff } from "lucide-react";
import { insertUserSchema } from "@shared/schema";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = insertUserSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState(searchParams.get("tab") || "login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (user) setLocation("/venues");
  }, [user, setLocation]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const loginForm = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "user" },
  });

  const onLogin = (data: z.infer<typeof loginSchema>) => loginMutation.mutate(data);
  const onRegister = (data: z.infer<typeof registerSchema>) => {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  };

 const handleGoogleLogin = () => {
  window.location.href = "http://localhost:27017/Queue/auth/google";
};

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-[#111118] to-[#0f0f13] text-white">

      {/* animated subtle background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] animate-pulse" />

      {/* mouse light */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.05), transparent 80%)` }}
      />

      <div className="relative grid lg:grid-cols-2 min-h-screen">

        {/* LEFT SIDE */}
        <div className="hidden lg:flex flex-col justify-between p-12 border-r border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">QueueBuddy</span>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center space-y-6">
            <div className="h-64 w-full rounded-2xl border border-white/10 overflow-hidden relative shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=800&q=80"
                alt="Real-time booking"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center text-zinc-300 font-medium text-sm backdrop-blur-sm bg-black/20">
                Real-time seat availability
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-5xl font-semibold leading-tight"><i>Book faster<br />Move smarter</i></h1>
              <p className="mt-4 text-zinc-500 max-w-md mx-auto">
                A modern way to reserve your spot without waiting in line.
              </p>
            </div>
          </div>

          <div className="text-xs text-zinc-600">© 2026 QueueBuddy</div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/[0.03] border border-white/10">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login">
                <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-glow">
                  <CardHeader>
                    <CardTitle>Welcome back</CardTitle>
                    <CardDescription className="text-zinc-500">Enter your credentials to continue</CardDescription>
                  </CardHeader>

                  <form onSubmit={loginForm.handleSubmit(onLogin)}>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" {...loginForm.register("email")} className="bg-black/40 border-white/10 focus:border-white" />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <div className="relative">
                          <Input type={showLoginPassword ? "text" : "password"} {...loginForm.register("password")} className="bg-black/40 border-white/10 pr-10 focus:border-white" />
                          <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                            {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3">
                      <Button className="w-full bg-white text-black hover:bg-zinc-200 transition" type="submit" disabled={loginMutation.isPending}>
                        {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Log in
                      </Button>

                      {/* Divider ----- OR ----- */}
                      <div className="flex items-center gap-3 my-4 text-gray-400 text-xs">
                        <div className="flex-1 h-px bg-gray-700" />
                        <span>OR</span>
                        <div className="flex-1 h-px bg-gray-700" />
                      </div>

                      {/* Google login */}
                      <Button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2 border border-gray-700 py-3 rounded-lg hover:bg-[#1f1f23] transition text-sm">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" />
                        Continue with Google
                      </Button>

                      {/* Switch prompt */}
                      <p className="text-center text-sm text-gray-400 mt-4">
                        Don't have an account?
                        <button onClick={() => setTab("register")} className="ml-1 text-white hover:underline">Register</button>
                      </p>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>

              {/* REGISTER */}
              <TabsContent value="register">
                <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-glow">
                  <CardHeader>
                    <CardTitle>Create an account</CardTitle>
                    <CardDescription className="text-zinc-500">Join QueueBuddy today</CardDescription>
                  </CardHeader>

                  <form onSubmit={registerForm.handleSubmit(onRegister)}>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input {...registerForm.register("name")} className="bg-black/40 border-white/10 focus:border-white" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" {...registerForm.register("email")} className="bg-black/40 border-white/10 focus:border-white" />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <div className="relative">
                          <Input type={showRegisterPassword ? "text" : "password"} {...registerForm.register("password")} className="bg-black/40 border-white/10 pr-10 focus:border-white" />
                          <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                            {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm Password</Label>
                        <div className="relative">
                          <Input type={showRegisterConfirm ? "text" : "password"} {...registerForm.register("confirmPassword")} className="bg-black/40 border-white/10 pr-10 focus:border-white" />
                          <button type="button" onClick={() => setShowRegisterConfirm(!showRegisterConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                            {showRegisterConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {registerForm.formState.errors.confirmPassword && <p className="text-sm text-red-400">{registerForm.formState.errors.confirmPassword.message}</p>}
                      </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3">
                      <Button className="w-full bg-white text-black hover:bg-zinc-200 transition" type="submit" disabled={registerMutation.isPending}>
                        {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Account
                      </Button>

                      {/* Divider ----- OR ----- */}
                      <div className="flex items-center gap-3 my-4 text-gray-400 text-xs">
                        <div className="flex-1 h-px bg-gray-700" />
                        <span>OR</span>
                        <div className="flex-1 h-px bg-gray-700" />
                      </div>

                      {/* Google login */}
                      
                     <Button
  type="button"
  className="w-full flex items-center justify-center gap-2 border border-gray-700 py-3 rounded-lg hover:bg-[#1f1f23] transition text-sm"
  onClick={handleGoogleLogin}
>
  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" />
  Continue with Google
</Button>

                      {/* Switch prompt */}
                      <p className="text-center text-sm text-gray-400 mt-4">
                        Already have an account?
                        <button onClick={() => setTab("login")} className="ml-1 text-white hover:underline">Login</button>
                      </p>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
