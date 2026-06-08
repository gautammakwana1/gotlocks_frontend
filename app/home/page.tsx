"use client";

import HomeTab from "@/components/home/HomeTab";
import { CurrentUser } from "@/lib/interfaces/interfaces";
import { getLocalStorage } from "@/lib/utils/jwtUtils";
import { useEffect, useState } from "react";

const HomePage = () => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checked, setChecked] = useState(false);

  // localStorage + redirect live in an effect (client-only) so the first render
  // is deterministic (renders nothing) and never reads browser globals or runs
  // side effects during render.
  useEffect(() => {
    const stored = getLocalStorage<CurrentUser>("currentUser");
    if (stored && !stored.username) {
      // No username yet — finish onboarding (full reload, same as before).
      window.location.href = "/auth/set-username";
      return;
    }
    setUser(stored);
    setChecked(true);
  }, []);

  if (!checked || !user?.username) return null;

  return <HomeTab />;
};

export default HomePage;
