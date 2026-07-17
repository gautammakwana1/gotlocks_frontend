export type PermissionDecision =
    | { allowed: true }
    | { allowed: false; code: string; reason: string };

export const allow = (): PermissionDecision => ({ allowed: true });

export const deny = (code: string, reason: string): PermissionDecision => ({
    allowed: false,
    code,
    reason,
});
