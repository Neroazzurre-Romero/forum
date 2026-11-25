import Link from "next/link";
import { connection } from "next/server";
import { listPosts } from "@/lib/posts";
import { formatDate } from "@/lib/format";

// 파일에서 최신 글을 매번 읽어오는 페이지
export const instant = false;

export default async function Home() {
  await connection(); // 항상 최신 파일 내용을 읽도록
  const posts = await listPosts();

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          전체 글 <span className="text-indigo-600">{posts.length}</span>
        </h1>
        <Link
          href="/write"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          ✏️ 글쓰기
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
          아직 게시물이 없어요. 첫 글을 남겨보세요!
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/posts/${p.id}`}
                className="flex items-center gap-4 px-4 py-4 hover:bg-indigo-50/50"
              >
                <span className="w-8 shrink-0 text-center text-sm text-slate-400">
                  {p.id}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.author} · {formatDate(p.createdAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
