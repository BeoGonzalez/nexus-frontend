import type { Metadata } from "next";
import { OrdersList } from "@/presentation/components/orders/OrdersList";

export const metadata: Metadata = {
  title: "Pedidos",
  robots: { index: false },
};

export default function OrdersPage() {
  return <OrdersList />;
}
