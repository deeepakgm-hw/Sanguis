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
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center text-center">
          <img src="/logo.jpg" alt="Sanguis Logo" className="mb-2 h-12 w-12 rounded-xl object-cover shadow-md" />
          <CardTitle className="text-2xl font-bold">Sign in to Sanguis</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
            <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />
            <Button type="submit" isLoading={isSubmitting} className="mt-2">
              Sign in
            </Button>
            
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full glass"
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
                className="w-full glass"
                onClick={() => {
                  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
                  window.location.href = `${apiBase}/auth/github`;
                }}
              >
                GitHub
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
