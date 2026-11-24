import { ProductDetail } from "@/presentation/components/product/ProductDetail";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetail id={id} />;
}
