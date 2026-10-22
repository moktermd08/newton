import { notFound } from "next/navigation";
import { CollectionView } from "@/components/collection-view";
import { getCollection } from "@/lib/lab";

export default async function DataCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const options = (await getCollection("data"))?.fields.find((f) => f.key === "category")?.options ?? [];
  const value = options.find((o) => o.toLowerCase() === decodeURIComponent(category).toLowerCase());
  if (!value) notFound();
  return <CollectionView collection="data" filter={{ key: "category", value }} />;
}
