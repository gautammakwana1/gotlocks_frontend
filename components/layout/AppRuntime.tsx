"use client";

import AppShell from "./AppShell";

export const AppRuntime = ({ children }: { children: React.ReactNode }) => (
    <AppShell>{children}</AppShell>
);

export default AppRuntime;
