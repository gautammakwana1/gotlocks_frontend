// /lib/utils/date.ts
// Date helpers for formatting deadlines and comparisons

export const formatDateTime = (iso: string | undefined | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export const formatTime = (iso: string | undefined | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export const isPast = (iso: string | undefined | null) => {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
};

export const isSameDay = (
  firstIso: string | undefined | null,
  secondIso: string | undefined | null
) => {
  if (!firstIso || !secondIso) return false;
  const first = new Date(firstIso);
  const second = new Date(secondIso);
  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return false;
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
};

export const toLocalInputValue = (iso: string | undefined | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60 * 1000);
  return adjusted.toISOString().slice(0, 16);
};

export const fromLocalInputValue = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

export const formatDateAndTime = (
  dateStr: string | null | undefined,
  timeStr: string | null | undefined
) => {
  if (!dateStr || !timeStr) return "—";

  // Combine date + time into one ISO string safely
  const isoString = `${dateStr}T${timeStr}:00`;

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export const isPastDateTime = (
  dateStr: string | null | undefined,
  timeStr: string | null | undefined
) => {
  if (!dateStr || !timeStr) return false;

  // Combine date + time into ISO-like format
  const isoString = `${dateStr}T${timeStr}:00`;

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return false;

  return date.getTime() < Date.now();
};

export const toLocalDateKeyFromUTC = (utcIso: string) => {
  const date = new Date(utcIso);

  if (Number.isNaN(date.getTime())) return "";

  // These now represent LOCAL timezone values
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
