import TableClient from "./TableClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TableClient tableId={id} />;
}