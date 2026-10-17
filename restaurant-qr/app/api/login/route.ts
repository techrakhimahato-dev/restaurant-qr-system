import { getStaffSession } from "../../lib/session";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = formData.get("username");
  const password = formData.get("password");
  const credentialsMatch =
    username === process.env.STAFF_LOGIN_USERNAME &&
    password === process.env.STAFF_LOGIN_PASSWORD;

  if (!credentialsMatch) {
    return Response.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }

  const session = await getStaffSession();
  session.isLoggedIn = true;
  await session.save();

  return Response.redirect(new URL("/staff", request.url), 303);
}
