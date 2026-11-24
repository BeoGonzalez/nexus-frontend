import type { Metadata } from "next";
import { OrderDetail } from "@/presentation/components/orders/OrderDetail";

export const metadata: Metadata = {
  robots: { index: false },
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
