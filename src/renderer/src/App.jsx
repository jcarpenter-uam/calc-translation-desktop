import { HashRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/auth/protected-route";
import Layout from "./components/general/layout";
import Login from "./pages/login";
import LandingPage from "./pages/landing";
import SessionPage from "./pages/session";
import AdminPage from "./pages/admin";
import OverlaySessionPage from "./pages/overlay-session";
import StandalonePage from "./pages/standalone";

export default function App() {
  return (
    <div className="min-h-screen">
      <HashRouter>
        {/* <ScrollToTop /> */}
        <Routes>
          <Route element={<Layout />}>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Routes for all authenticated users */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/sessions/:integration/*"
                element={<SessionPage />}
              />
              <Route path="/standalone/host" element={<StandalonePage />} />
            </Route>

            {/* Routes for admin users only */}
            <Route element={<ProtectedRoute adminOnly={true} />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route
              path="/overlay/session/:integration/*"
              element={<OverlaySessionPage />}
            />
          </Route>
        </Routes>
      </HashRouter>
    </div>
  );
}
