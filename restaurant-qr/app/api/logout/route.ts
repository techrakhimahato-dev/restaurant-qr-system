import { getStaffSession } from "../../lib/session";

export async function POST(request: Request) {
  const session = await getStaffSession();
  session.destroy();
  return Response.redirect(new URL("/login", request.url), 303);
}