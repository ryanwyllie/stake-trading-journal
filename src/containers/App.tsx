import React from "react";
import {
  withRouter,
  Route,
  Switch,
  useLocation,
  Redirect,
} from "react-router-dom";
import { useCurrentUser } from "../libs/hooks/user";

import LoginPage from "../pages/Login";
import LogoutPage from "../pages/Logout";
import JournalPage from "../pages/Journal";

const App: React.FC = () => {
  const location = useLocation();
  const user = useCurrentUser();
  const unauthenticatedRoutes = [
    <Route key={"/login"} path="/login" exact component={LoginPage} />,
    <Redirect key={"redirect/login"} to="/login" />,
  ];
  const authenticatedRoutes = [
    <Route key={"/journal"} path="/journal" exact>
      <JournalPage user={user!} />
    </Route>,
    <Route key={"/logout"} path="/logout" exact>
      <LogoutPage user={user!} />
    </Route>,
    <Redirect key={"redirect/journal"} to="/journal" />,
  ];

  return (
    <Switch location={location}>
      {user ? authenticatedRoutes : unauthenticatedRoutes}
    </Switch>
  );
};

export default withRouter(App);
