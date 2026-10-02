import { ROLES } from "./constants";

export const isAdminLevel = (level) => level === ROLES.ADMIN || level === ROLES.SUPER_ADMIN;
export const isSuperAdmin = (level) => level === ROLES.SUPER_ADMIN;
export const isAccountManager = (level) => level === ROLES.ACCOUNT_MANAGER;

/* Which client ids this person is allowed to see revenue/cost/margin for.
   null means "all clients" (admin and above). Contributors never reach this check,
   they don't get a profitability view at all. */
export function visibleClientIds(user, cfg) {
  if (!user) return [];
  if (isAdminLevel(user.accessLevel)) return null;
  if (isAccountManager(user.accessLevel)) return user.managedClients || [];
  return [];
}

export function canSeeTab(user, tabKey) {
  if (!user) return tabKey === "entry";
  const level = user.accessLevel || ROLES.CONTRIBUTOR;
  switch (tabKey) {
    case "entry":
      return true;
    case "reports":
      return level !== ROLES.CONTRIBUTOR;
    case "profit":
      return level !== ROLES.CONTRIBUTOR;
    case "setup":
      return isAdminLevel(level);
    case "admin":
      return isSuperAdmin(level);
    default:
      return false;
  }
}

/* Where a person lands right after choosing who they are. Contributors go straight
   to their own timesheet; everyone with a broader view opens on the numbers instead. */
export function landingTab(user) {
  if (!user) return "entry";
  const level = user.accessLevel || ROLES.CONTRIBUTOR;
  if (level === ROLES.CONTRIBUTOR) return "entry";
  return "profit";
}
