import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getPost } from "@/lib/posts";
import PostForm from "@/components/PostForm";
import { updatePostAction } from "@/app/actions";

export const instant = false;

export default async function EditPage({
  params,
}: PageProps<"/posts/[id]/edit">) {
  await connection();
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  const post = await getPost(postId);
  if (!post) notFound();

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold">글 수정</h1>
      <PostForm
        action={updatePostAction.bind(null, post.id)}
        mode="edit"
        cancelHref={`/posts/${post.id}`}
        initial={{
          author: post.author,
          title: post.title,
          content: post.content,
        }}
      />
    </section>
  );
}
