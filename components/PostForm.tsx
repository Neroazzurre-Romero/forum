"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/app/actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
  cancelHref: string;
  initial?: { author: string; title: string; content: string };
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function PostForm({ action, mode, cancelHref, initial }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            이름
          </span>
          <input
            name="author"
            defaultValue={initial?.author}
            maxLength={20}
            required
            placeholder="작성자 이름"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            비밀번호
          </span>
          <input
            name="password"
            type="password"
            maxLength={50}
            required
            autoComplete="off"
            placeholder={
              mode === "create"
                ? "수정·삭제할 때 필요해요"
                : "글 작성 시 입력한 비밀번호"
            }
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          제목
        </span>
        <input
          name="title"
          defaultValue={initial?.title}
          maxLength={100}
          required
          placeholder="제목을 입력하세요"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          내용
        </span>
        <textarea
          name="content"
          defaultValue={initial?.content}
          maxLength={5000}
          required
          rows={10}
          placeholder="내용을 입력하세요"
          className={inputClass}
        />
      </label>

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Link
          href={cancelHref}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "저장 중..." : mode === "create" ? "등록" : "수정 완료"}
        </button>
      </div>
    </form>
  );
}
