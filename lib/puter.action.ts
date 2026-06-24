import puter from "@heyputer/puter.js";
import type { User } from "@heyputer/puter.js/types/modules/auth";

export const signIn = async () => await puter.auth.signIn();

export const signOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch {
    return null;
  }
};
