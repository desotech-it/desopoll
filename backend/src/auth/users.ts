import bcrypt from "bcryptjs";
import { db } from "../db.js";

export interface AppUser {
  id: string;
  email: string;
  display_name: string | null;
  role: "user" | "admin";
  status: string;
}

const SELECT = `id, email, display_name, role, status`;

export async function findUserByEmail(email: string): Promise<(AppUser & { password_hash: string }) | null> {
  const { rows } = await db().query<AppUser & { password_hash: string }>(
    `SELECT ${SELECT}, password_hash FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const { rows } = await db().query<AppUser>(`SELECT ${SELECT} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function verifyLocalPassword(email: string, password: string): Promise<AppUser | null> {
  const u = await findUserByEmail(email);
  if (!u || !u.password_hash || u.status !== "active") return null;
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return null;
  return { id: u.id, email: u.email, display_name: u.display_name, role: u.role, status: u.status };
}

// Just-in-time provisioning for SSO logins. Promotes to admin when the user is in the
// configured IdP admin group; never auto-demotes an existing admin.
export async function upsertOidcUser(params: {
  email: string;
  displayName?: string | null;
  isAdmin: boolean;
}): Promise<AppUser> {
  const existing = await findUserByEmail(params.email);
  if (existing) {
    const role = params.isAdmin ? "admin" : existing.role;
    const { rows } = await db().query<AppUser>(
      `UPDATE users SET display_name = COALESCE($2, display_name), role = $3, status = 'active', updated_at = now()
       WHERE id = $1 RETURNING ${SELECT}`,
      [existing.id, params.displayName ?? null, role],
    );
    return rows[0];
  }
  const { rows } = await db().query<AppUser>(
    `INSERT INTO users (email, password_hash, display_name, role, status)
     VALUES ($1, '', $2, $3, 'active') RETURNING ${SELECT}`,
    [params.email, params.displayName ?? null, params.isAdmin ? "admin" : "user"],
  );
  return rows[0];
}
