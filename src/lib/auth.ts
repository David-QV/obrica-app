import { cookies } from "next/headers";
import { getDb } from "./db";
import bcrypt from "bcryptjs";

const SESSION_COOKIE_NAME = "obrica_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

interface SessionData {
  userId: number;
  username: string;
  nombre: string | null;
  rol: string;
}

export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; user?: SessionData; error?: string }> {
  try {
    const db = getDb();
    const user = db
      .prepare(
        "SELECT id, username, password_hash, nombre, rol, activo FROM usuarios WHERE username = ?"
      )
      .get(username) as
      | {
          id: number;
          username: string;
          password_hash: string;
          nombre: string | null;
          rol: string;
          activo: number;
        }
      | undefined;

    if (!user) {
      return { success: false, error: "Usuario o contraseña incorrectos" };
    }

    if (!user.activo) {
      return { success: false, error: "Usuario desactivado" };
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return { success: false, error: "Usuario o contraseña incorrectos" };
    }

    const sessionData: SessionData = {
      userId: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol,
    };

    // Crear cookie de sesión
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return { success: true, user: sessionData };
  } catch (error) {
    console.error("Error en login:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const sessionData: SessionData = JSON.parse(sessionCookie.value);
    return sessionData;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    throw new Error("No autenticado");
  }
  return session;
}
