"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ShieldCheck, LogIn } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    try {
      const { data } = await api.post("/auth/login", values);
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Login failed");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 bg-background">
      {/* Background radial highlight */}
      <div className="absolute top-[30%] left-[50%] -translate-x-[50%] -translate-y-[50%] h-[400px] w-[400px] rounded-full bg-destructive/5 blur-[100px] pointer-events-none" />

      {/* Grid Lines Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))/0.1_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))/0.1_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <Card className="w-full max-w-sm glass-card border border-border/40 relative z-10 shadow-2xl">
        <CardHeader className="flex flex-col items-center text-center pb-2">
          <div className="mb-3 rounded-full bg-destructive/10 p-3 text-destructive shadow-inner">
            <LogIn className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-glow">Sign in to Sanguis</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Email Address" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
            <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />
            
            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full font-semibold bg-destructive hover:bg-destructive/90 text-white shadow-lg active:scale-[0.98] transition-all">
              Sign In
            </Button>
            
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold">
                <span className="bg-background px-2 text-muted-foreground">Or connect with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs font-semibold glass hover:bg-muted"
                onClick={() => {
                  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
                  window.location.href = `${apiBase}/auth/google`;
                }}
              >
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs font-semibold glass hover:bg-muted"
                onClick={() => {
                  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
                  window.location.href = `${apiBase}/auth/github`;
                }}
              >
                GitHub
              </Button>
            </div>

            <div className="mt-4 text-center text-xs text-muted-foreground border-t border-border/40 pt-4">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-bold text-destructive hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
