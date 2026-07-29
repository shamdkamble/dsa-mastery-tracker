"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChapterNav({
  prev,
  next,
}: {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6">
      {prev ? (
        <Button
          variant="secondary"
          type="button"
          onClick={() => router.push(`/textbook/${prev.slug}`)}
        >
          <ArrowLeft className="h-4 w-4" /> {prev.title}
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button type="button" onClick={() => router.push(`/textbook/${next.slug}`)}>
          {next.title} <ArrowRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/debrief")}
        >
          Week debrief
        </Button>
      )}
      {/* SEO / no-JS fallback links */}
      <div className="sr-only">
        {prev && <Link href={`/textbook/${prev.slug}`}>Previous: {prev.title}</Link>}
        {next && <Link href={`/textbook/${next.slug}`}>Next: {next.title}</Link>}
      </div>
    </div>
  );
}
