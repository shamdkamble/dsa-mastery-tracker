"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/base-path";

export function ChapterNav({
  prev,
  next,
}: {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6">
      {prev ? (
        <Button variant="secondary" type="button" asChild>
          <a href={withBasePath(`/textbook/${prev.slug}/`)}>
            <ArrowLeft className="h-4 w-4" /> {prev.title}
          </a>
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button type="button" asChild>
          <a href={withBasePath(`/textbook/${next.slug}/`)}>
            {next.title} <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      ) : (
        <Button type="button" variant="secondary" asChild>
          <a href={withBasePath("/debrief/")}>Week debrief</a>
        </Button>
      )}
    </div>
  );
}
