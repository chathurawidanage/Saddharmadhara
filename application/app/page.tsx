import Application from "./forms/App";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { retreat } = await searchParams;
  const retreatString = Array.isArray(retreat) ? retreat[0] : retreat;
  return <Application retreat={retreatString} />;
}
