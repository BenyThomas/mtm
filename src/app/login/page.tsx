"use client";

import React, { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  UserStar,
  BadgeDollarSign,
  BarChart3,
  Clock,
  TrendingUp,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

// Force dynamic rendering
export const dynamic = "force-dynamic";

const formSchema = z.object({
  username: z
    .string()
    .min(1, {
      message: "Username is required.",
    })
    .min(3, {
      message: "Username must be at least 3 characters.",
    }),
  password: z
    .string()
    .min(1, {
      message: "Password is required.",
    })
    .min(6, {
      message: "Password must be at least 6 characters.",
    }),
  tenant: z.string().min(1, {
    message: "Tenant is required.",
  }),
  remember: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

// Feature boxes data
const features = [
  {
    icon: UserStar,
    title: "Client Management",
    description: "Streamline client onboarding and management processes",
    color: "bg-blue-800",
  },
  {
    icon: BadgeDollarSign,
    title: "Loan Processing",
    description: "Automate loan applications and approval workflows",
    color: "bg-green-800",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Comprehensive insights into your microfinance operations",
    color: "bg-purple-800",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Compliant",
    description: "Bank-grade security with regulatory compliance",
    color: "bg-orange-800",
  },
  {
    icon: Clock,
    title: "Real-time Updates",
    description: "Live data synchronization across all operations",
    color: "bg-indigo-800",
  },
  {
    icon: TrendingUp,
    title: "Growth Tracking",
    description: "Monitor portfolio performance and growth metrics",
    color: "bg-green-800",
  },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      tenant: "default",
      remember: false,
    },
  });

  async function onSubmit(values: FormData) {
    setLoading(true);
    try {
      await login(
        values.username,
        values.password,
        values.remember,
        values.tenant
      );
      toast.success("Login successful!");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex">
      {/* Left Panel - Feature Highlights */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, #6366f1 2px, transparent 0)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        {/* Floating Feature Boxes */}
        <div className="relative z-10 p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Money Trust Microfinance
            </h1>
            <p className="text-lg text-gray-600">
              Empower your microfinance operations with our comprehensive
              platform
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-4 hover:shadow-sm transition-all duration-300 hover:translate-x-1 bg-white/80 backdrop-blur-sm border-0 shadow-xs"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <CardContent className="p-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-full ${feature.color} text-white`}
                    >
                      <feature.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {feature.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full lg:w-1/2">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-black rounded-full shadow-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">K</span>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="text-center mb-5">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back!
            </h2>
            <p className="text-gray-600 text-sm">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900">Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your username"
                        disabled={loading}
                        {...field}
                        className="pr-10 placeholder:text-gray-600 text-gray-800"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          disabled={loading}
                          {...field}
                          className="pr-10 placeholder:text-gray-600 text-gray-800"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* <FormField
                control={form.control}
                name="tenant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900">Tenant</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="default"
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}

              <div className="flex items-center justify-end">
                <Button
                  variant="ghost"
                  disabled={loading}
                  className="text-sm self-end text-indigo-800 hover:text-indigo-bg-indigo-600 font-medium p-0"
                >
                  Forgot Password?
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-800 hover:bg-indigo-600 text-white mt-4"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
