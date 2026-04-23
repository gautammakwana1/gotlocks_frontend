"use client";

import HomeTab from "@/components/home/HomeTab";
import { CurrentUser } from "@/lib/interfaces/interfaces";
import { getLocalStorage } from "@/lib/utils/jwtUtils";

const HomePage = () => {
  const storedUser = getLocalStorage<CurrentUser>("currentUser");

  if (!storedUser) return null;

  const hasUsername = storedUser?.username;

  if (!hasUsername) {
    window.location.href = "/auth/set-username";
    return null;
  }

  return <HomeTab />;
};

export default HomePage;
