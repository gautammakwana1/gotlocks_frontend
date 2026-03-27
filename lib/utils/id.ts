// /lib/utils/id.ts
// Small utility to generate readable mock IDs

let counter = 0;

export const generateId = (prefix: string) => {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
};

export const generateInviteCode = () => {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join(
    ""
  );
};
