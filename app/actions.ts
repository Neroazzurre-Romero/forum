"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPost,
  deletePost,
  updatePost,
  type MutationResult,
} from "@/lib/posts";

export type FormState = { error: string } | null;

const LIMITS = { author: 20, password: 50, title: 100, content: 5000 };

function readFields(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  return {
    author: get("author"),
    password: String(formData.get("password") ?? ""),
    title: get("title"),
    content: get("content"),
  };
}

function validate(f: ReturnType<typeof readFields>): string | null {
  if (!f.author) return "이름을 입력해 주세요.";
  if (!f.password) return "비밀번호를 입력해 주세요.";
  if (!f.title) return "제목을 입력해 주세요.";
  if (!f.content) return "내용을 입력해 주세요.";
  if (f.author.length > LIMITS.author)
    return `이름은 ${LIMITS.author}자 이하로 입력해 주세요.`;
  if (f.password.length > LIMITS.password)
    return `비밀번호는 ${LIMITS.password}자 이하로 입력해 주세요.`;
  if (f.title.length > LIMITS.title)
    return `제목은 ${LIMITS.title}자 이하로 입력해 주세요.`;
  if (f.content.length > LIMITS.content)
    return `내용은 ${LIMITS.content}자 이하로 입력해 주세요.`;
  return null;
}

function resultMessage(r: MutationResult): string | null {
  if (r === "wrong_password") return "비밀번호가 맞지 않습니다.";
  if (r === "not_found") return "게시물을 찾을 수 없습니다.";
  return null;
}

export async function createPostAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const f = readFields(formData);
  const error = validate(f);
  if (error) return { error };

  const post = await createPost(f);
  revalidatePath("/");
  redirect(`/posts/${post.id}`);
}

export async function updatePostAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const f = readFields(formData);
  const error = validate(f);
  if (error) return { error };

  const msg = resultMessage(
    await updatePost(id, f.password, {
      author: f.author,
      title: f.title,
      content: f.content,
    }),
  );
  if (msg) return { error: msg };

  revalidatePath("/");
  revalidatePath(`/posts/${id}`);
  redirect(`/posts/${id}`);
}

export async function deletePostAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "비밀번호를 입력해 주세요." };

  const msg = resultMessage(await deletePost(id, password));
  if (msg) return { error: msg };

  revalidatePath("/");
  redirect("/");
}
