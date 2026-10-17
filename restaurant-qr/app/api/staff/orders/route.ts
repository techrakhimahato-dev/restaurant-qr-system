import { getStaffSession } from "../../../lib/session";

export async function GET() {
  const session = await getStaffSession();

  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const staffApiKey = process.env.STAFF_API_KEY;

  if (!apiUrl || !staffApiKey) {
    return Response.json(
      { error: "Server configuration is missing" },
      { status: 500 },
    );
  }

  const backendResponse = await fetch(`${apiUrl}/orders`, {
    headers: {
      Authorization: `Bearer ${staffApiKey}`,
    },
    cache: "no-store",
  });
  const data = await backendResponse.json();
  return Response.json(data, { status: backendResponse.status });
}
