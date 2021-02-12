import { User } from "../../types";

export const useCurrentUser = () => {
  const userJson = window.localStorage.getItem("user");

  if (userJson) {
    return JSON.parse(userJson) as User;
  } else {
    return null;
  }
};
