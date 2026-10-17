import { getStaffSession } from "../../../../../lib/session";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const { orderId } = await params;
  try {
    const backendResponse = await fetch(
      `${apiUrl}/orders/${encodeURIComponent(orderId)}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${staffApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    const data = await backendResponse.json();
    return Response.json(data, { status: backendResponse.status });
  } catch {
    return Response.json(
      { error: "Could not reach the orders service" },
      { status: 502 },
    );
  }
}
