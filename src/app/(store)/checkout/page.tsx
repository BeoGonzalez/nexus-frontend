import type { Metadata } from "next";
import { CheckoutFlow } from "@/presentation/components/checkout/CheckoutFlow";

export const metadata: Metadata = {
  title: "Pagar",
  robots: { index: false },
};

export default function CheckoutPage() {
  return <CheckoutFlow />;
}
