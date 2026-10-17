import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export type StaffSession = {
  isLoggedIn?: boolean;
};

const sessionPassword = process.env.STAFF_SESSION_SECRET;

if (!sessionPassword || sessionPassword.length < 32) {
  throw new Error("STAFF_SESSION_SECRET must be at least 32 characters.");
}

export const sessionOptions = {
  password: sessionPassword,
  cookieName: "restaurant_staff_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
  ttl: 60 * 60 * 8,
};
export async function getStaffSession() {
  return getIronSession<StaffSession>(await cookies(), sessionOptions);
}