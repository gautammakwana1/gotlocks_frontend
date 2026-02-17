"use client";

import HomeTab from "@/components/home/HomeTab";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

const HomePage = () => {
  const currentUser = useCurrentUser();

  if (!currentUser) return null;

  return <HomeTab />;
};

export default HomePage;
