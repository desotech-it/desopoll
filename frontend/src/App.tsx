// Router + app shell. Renders the login card when logged out, otherwise the shell.
import React from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { Login } from "./screens/Login";
import { Dashboard } from "./screens/Dashboard";
import { QuizEditor } from "./screens/QuizEditor";
import { AdminUsers } from "./screens/AdminUsers";
import { BrandMark, btnGhost, glass, pageStyle, Spinner, tokens } from "./ui";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </AuthProvider>
  );
}

function Root() {
  const { user, loading } = useAuth();

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
        <Spinner label="Caricamento…" />
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
    <div style={pageStyle}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: 24 }}>
        <TopBar isAdmin={isAdmin} onLogout={logout} userEmail={user!.email} role={user!.role} />
        <div style={{ marginTop: 26 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/quiz/:id" element={<QuizEditor />} />
            <Route
              path="/admin/users"
              element={isAdmin ? <AdminUsers /> : <Navigate to="/" replace />}
            />
            <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
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
  const location = useLocation();
  const onDashboard = location.pathname === "/" || location.pathname.startsWith("/quiz");
  const onAdmin = location.pathname.startsWith("/admin");

  return (
    <div
      style={{
        ...glass,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 20px",
        flexWrap: "wrap",
      }}
    >
      <Link to="/" style={{ textDecoration: "none" }}>
        <BrandMark size={20} />
      </Link>

      <nav style={{ display: "flex", gap: 6, marginLeft: 12 }}>
        <NavLink to="/" active={onDashboard}>
          Dashboard
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin/users" active={onAdmin}>
            Admin
          </NavLink>
        )}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto", flexWrap: "wrap" }}>
        <div style={{ textAlign: "right", lineHeight: 1.3 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: tokens.ink }}>{userEmail}</div>
          <div style={{ fontSize: 11.5, color: tokens.brandInk }}>
            {role === "admin" ? "Amministratore" : "Utente"}
          </div>
        </div>
        <button style={btnGhost} onClick={onLogout}>
          Esci
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
