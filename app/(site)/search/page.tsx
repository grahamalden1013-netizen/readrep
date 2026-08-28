import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/primitives";
import { SearchView } from "@/components/search/SearchView";

export const metadata: Metadata = {
  title: "Search",
  description: "Search debates, articles, issues and parties.",
};

export default function SearchPage() {
  return (
    <>
      <PageHeader eyebrow="Find" title="Search" />
      <Container width="reading" className="py-10 sm:py-12">
        <SearchView />
      </Container>
    </>
  );
}
