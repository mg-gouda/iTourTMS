"use client";

import { useParams } from "next/navigation";

import { ProductDetail } from "@/components/b2b/product-detail";

export default function PartnerPackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProductDetail productType="PACKAGE" productId={id} />;
}
