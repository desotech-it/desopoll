// Router + app shell. Renders the login card when logged out, otherwise the shell.
import React, { useEffect } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./auth";
import { LanguageSelector } from "./i18n/LanguageSelector";
import { setLanguage } from "./i18n";
import { Login } from "./screens/Login";
import { Dashboard } from "./screens/Dashboard";
import { QuizEditor } from "./screens/QuizEditor";
import { AdminUsers } from "./screens/AdminUsers";
import { AdminGroups } from "./screens/admin/AdminGroups";
import { HostConsole } from "./screens/host/HostConsole";
import { ReportScreen } from "./screens/report/ReportScreen";
import { Join } from "./screens/Join";
import { PlayGame } from "./screens/play/PlayGame";
import { BrandMark, btnGhost, glass, pageStyle, Spinner, tokens } from "./ui";
import { useIsNarrow } from "./responsive";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC player routes — rendered OUTSIDE the auth gate. */}
          <Route path="/join" element={<Join />} />
          <Route path="/play/:sessionId" element={<PlayGame />} />
          {/* Everything else goes through the auth gate / app shell. */}
          <Route path="/*" element={<Root />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function Root() {
  const { user, loading } = useAuth();
  const { t } = useTranslation("common");

  // When a logged-in user has a stored UI language preference, seed the active
  // language from it (also persists to localStorage). The manual selector still
  // overrides this afterwards.
  useEffect(() => {
    if (user?.ui_language) setLanguage(user.ui_language);
  }, [user?.ui_language]);

  if (loading) {
    return (
      <div
        style={{
          ...pageStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner label={t("loading")} />
      </div>
    );
  }

  if (!user) return <Login />;

  return <Shell />;
}

function Shell() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <Routes>
      {/* Host console is auth-gated but full-bleed (its own GameStage). */}
      <Route path="/host/:sessionId" element={<HostConsole />} />
      <Route
        path="/*"
        element={
          <div style={pageStyle}>
            <div className="poll-shell" style={{ maxWidth: 1040, margin: "0 auto" }}>
              <TopBar isAdmin={isAdmin} onLogout={logout} userEmail={user!.email} role={user!.role} />
              <div style={{ marginTop: 22 }}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/quiz/:id" element={<QuizEditor />} />
                  <Route path="/report/:sessionId" element={<ReportScreen />} />
                  <Route
                    path="/admin/users"
                    element={isAdmin ? <AdminUsers /> : <Navigate to="/" replace />}
                  />
                  <Route
                    path="/admin/groups"
                    element={isAdmin ? <AdminGroups /> : <Navigate to="/" replace />}
                  />
                  <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

function TopBar({
  isAdmin,
  onLogout,
  userEmail,
  role,
}: {
  isAdmin: boolean;
  onLogout: () => void;
  userEmail: string;
  role: string;
}) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const narrow = useIsNarrow();
  const onDashboard = location.pathname === "/" || location.pathname.startsWith("/quiz");
  const onAdminUsers = location.pathname === "/admin/users" || location.pathname === "/admin";
  const onAdminGroups = location.pathname.startsWith("/admin/groups");

  return (
    <div
      style={{
        ...glass,
        display: "flex",
        alignItems: "center",
        gap: narrow ? 8 : 16,
        padding: narrow ? "10px 14px" : "12px 20px",
        flexWrap: "wrap",
      }}
    >
      <Link to="/" style={{ textDecoration: "none" }}>
        <BrandMark size={narrow ? 17 : 20} />
      </Link>

      <nav style={{ display: "flex", gap: 4, marginLeft: narrow ? 0 : 12, flexWrap: "wrap" }}>
        <NavLink to="/" active={onDashboard}>
          {t("nav.dashboard")}
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin/users" active={onAdminUsers}>
            {t("nav.admin")}
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/groups" active={onAdminGroups}>
            {t("nav.groups")}
          </NavLink>
        )}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: narrow ? 8 : 12, marginLeft: "auto" }}>
        <LanguageSelector />
        {/* On phones hide the email (it forces an awkward extra row) and show
            only the role; the full email stays on wider screens. */}
        {narrow ? (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: tokens.brandInk }}>
            {role === "admin" ? t("roles.admin") : t("roles.user")}
          </span>
        ) : (
          <div style={{ textAlign: "right", lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: tokens.ink }}>{userEmail}</div>
            <div style={{ fontSize: 11.5, color: tokens.brandInk }}>
              {role === "admin" ? t("roles.admin") : t("roles.user")}
            </div>
          </div>
        )}
        <button style={btnGhost} onClick={onLogout}>
          {t("actions.logout")}
        </button>
      </div>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 14px",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        textDecoration: "none",
        color: active ? tokens.brandInk : tokens.ink2,
        background: active ? "rgba(108,92,231,0.12)" : "transparent",
      }}
    >
      {children}
    </Link>
  );
}
