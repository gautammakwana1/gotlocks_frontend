import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Gotlocks",
  description: "Sign in to your gotlocks account or create a new account.",
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
