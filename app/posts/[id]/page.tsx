import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getPost } from "@/lib/posts";
import DeleteForm from "@/components/DeleteForm";
import { formatDate } from "@/lib/format";

export const instant = false;

export default async function PostPage({ params }: PageProps<"/posts/[id]">) {
  await connection();
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  const post = await getPost(postId);
  if (!post) notFound();

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="border-b border-slate-100 pb-4">
        <h1 className="break-words text-2xl font-bold">{post.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {post.author} · {formatDate(post.createdAt)}
          {post.updatedAt && ` (수정됨 ${formatDate(post.updatedAt)})`}
        </p>
      </header>

      <div className="whitespace-pre-wrap break-words py-6 leading-relaxed">
        {post.content}
      </div>

      <footer className="flex flex-wrap items-start justify-between gap-4 border-t border-slate-100 pt-4">
        <Link
          href="/"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ← 목록
        </Link>
        <div className="flex flex-wrap items-start gap-2">
          <Link
            href={`/posts/${post.id}/edit`}
            className="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            수정
          </Link>
          <DeleteForm id={post.id} />
        </div>
      </footer>
    </article>
  );
}
