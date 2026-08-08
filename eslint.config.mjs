import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// `state.group.group` is a SINGLE-TENANT slot shared by every League and Arena
// screen. Reading it raw returns whichever group was viewed last, and because React
// flushes child effects before parent effects, the first commit after a navigation
// mounts children with that stale id — which is how five /group/arena/* reads went
// out carrying a League id. useScopedGroup compares the record's id to the id the
// URL asked for, during render, and returns null on a mismatch.
//
// Scoped to the group screens that have been migrated. The Slip contest flow is
// deliberately NOT included: those routes never dispatch fetchGroupByIdRequest, so a
// fail-closed hook would leave them permanently "loading" and disable their actions.
// Migrating them needs the group fetch added first — a separate change.
const SCOPED_GROUP_ENFORCED_FILES = [
  "app/league/**/page.tsx",
  "app/arena/**/page.tsx",
  "components/arenas/**/*.tsx",
  "components/group/**/*.tsx",
];

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    files: SCOPED_GROUP_ENFORCED_FILES,
    ignores: ["lib/groups/useScopedGroup.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.property.name='group'][property.name='group']",
          message:
            "state.group.group is a single-tenant slot shared by every League and Arena screen, " +
            "so a raw read returns the PREVIOUS group on the first commit after navigating. " +
            "Read it through useScopedGroup(urlId) from @/lib/groups/useScopedGroup, which only " +
            "returns the record when its id matches the id the URL asked for.",
        },
      ],
    },
  },
];

export default eslintConfig;
