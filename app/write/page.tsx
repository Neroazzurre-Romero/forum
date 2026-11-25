import PostForm from "@/components/PostForm";
import { createPostAction } from "@/app/actions";

export const metadata = { title: "글쓰기 | 게시판" };

export default function WritePage() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold">글쓰기</h1>
      <PostForm action={createPostAction} mode="create" cancelHref="/" />
    </section>
  );
}
