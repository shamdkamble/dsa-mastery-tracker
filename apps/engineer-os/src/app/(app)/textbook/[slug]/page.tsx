import Link from "next/link";
import { notFound } from "next/navigation";
import { getChapterBySlug, WEEK1_CHAPTERS } from "@/data/week1";
import { ChapterView } from "@/components/textbook/chapter-view";
import { ChapterNav } from "@/components/textbook/chapter-nav";

export function generateStaticParams() {
  return WEEK1_CHAPTERS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapterBySlug(slug);
  if (!chapter) return { title: "Chapter not found · EngineerOS" };
  return {
    title: `${chapter.title} · EngineerOS Textbook`,
    description: chapter.subtitle,
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapterBySlug(slug);

  if (!chapter) {
    notFound();
  }

  const idx = WEEK1_CHAPTERS.findIndex((c) => c.id === chapter.id);
  const prev = idx > 0 ? WEEK1_CHAPTERS[idx - 1] : null;
  const next = idx < WEEK1_CHAPTERS.length - 1 ? WEEK1_CHAPTERS[idx + 1] : null;

  return (
    <div className="space-y-8">
      <Link
        href="/textbook"
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
      >
        ← All chapters
      </Link>

      <ChapterView chapter={chapter} />

      <ChapterNav
        prev={prev ? { slug: prev.slug, title: prev.title } : null}
        next={next ? { slug: next.slug, title: next.title } : null}
      />
    </div>
  );
}
