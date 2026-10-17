import { redirect } from "next/navigation";
import { getStaffSession } from "../lib/session";
import OrderBoard from "./OrderBoard";

export default async function Page() {
  const session = await getStaffSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return (
    <main className="staff-page">
      <h1>Admin Dashboard</h1>
      <form action="/api/logout" method="POST">
        <button type="submit">Log out</button>
      </form>
      <OrderBoard />
    </main>
  );
}
