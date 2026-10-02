import { norm } from "./helpers";

/* Identity is established by matching a typed email against the team roster kept
   in Setup — there is no password. This is a trust model, the same one the old
   name-picker used, just harder to do by accident since you need someone's actual
   email rather than a click. A follow-up (emailed one-time code) can harden this
   later without changing how the rest of the app reads "who is signed in". */
export function findByEmail(employees, email) {
  const target = norm(email);
  if (!target) return null;
  return employees.find((e) => e.email && norm(e.email) === target) || null;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}
