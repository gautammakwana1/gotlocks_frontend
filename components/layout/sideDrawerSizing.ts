/*
 * Side drawers render through a portal on document.body, which sits outside the
 * [data-app-scale="desktop"] scope, so they cannot inherit the scaled
 * --container-* tokens. These are the resolved desktop widths instead:
 * `workspace` matches the scaled --container-4xl (63rem), `standard` is the
 * reading-width panel used by menus, notifications, chat and filter drawers.
 */
export const SIDE_DRAWER_DESKTOP_WIDTH = {
  standard: "lg:max-w-[600px]",
  workspace: "lg:max-w-[1008px]",
} as const;
