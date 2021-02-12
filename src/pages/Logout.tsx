import React, { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { logout } from "../libs/clients/stake";
import { User } from "../types";

interface LogoutPageProps {
  user: User;
}
const LogoutPage: React.FC<LogoutPageProps> = ({ user }) => {
  const history = useHistory();

  useEffect(() => {
    logout(user);
    window.localStorage.removeItem("user");
    window.localStorage.removeItem("journalData");
    window.localStorage.removeItem("journalLastFetchDate");
    history.push("/login");
  }, []);

  return null;
};

export default LogoutPage;
