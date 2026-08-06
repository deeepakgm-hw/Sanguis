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
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center text-center">
          <img src="/logo.jpg" alt="Sanguis Logo" className="mb-2 h-12 w-12 rounded-xl object-cover shadow-md" />
          <CardTitle className="text-2xl font-bold">Register for Sanguis</CardTitle>
          <CardDescription>Takes less than a minute</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Name" placeholder="Ada Lovelace" error={errors.name?.message} {...register("name")} />
            <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
            <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />
            <Button type="submit" isLoading={isSubmitting} className="mt-2">
              Create account
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
