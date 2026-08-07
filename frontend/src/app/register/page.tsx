"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Heart } from "lucide-react";

// Mirrors the backend's password policy so users get instant feedback
// instead of a round trip to discover the rule.
const registerSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(10, "At least 10 characters")
    .regex(/[a-z]/, "Needs a lowercase letter")
    .regex(/[A-Z]/, "Needs an uppercase letter")
    .regex(/[0-9]/, "Needs a number")
    .regex(/[^A-Za-z0-9]/, "Needs a special character"),
});
type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterForm) {
    try {
      await api.post("/auth/register", values);
      toast.success("Account created. Please sign in.");
      router.push("/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Registration failed");
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
            <Heart className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-glow">Register for Sanguis</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Become a community lifesaver today</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Full Name" placeholder="Ada Lovelace" error={errors.name?.message} {...register("name")} />
            <Input label="Email Address" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
            <Input label="Create Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />
            
            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full font-semibold bg-destructive hover:bg-destructive/90 text-white shadow-lg active:scale-[0.98] transition-all">
              Create Account
            </Button>

            <div className="mt-4 text-center text-xs text-muted-foreground border-t border-border/40 pt-4">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-destructive hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
