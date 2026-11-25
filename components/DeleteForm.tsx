"use client";

import { useActionState } from "react";
import { deletePostAction } from "@/app/actions";

export default function DeleteForm({ id }: { id: number }) {
  const [state, formAction, pending] = useActionState(
    deletePostAction.bind(null, id),
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        name="password"
        type="password"
        required
        autoComplete="off"
        placeholder="삭제용 비밀번호"
        className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "삭제 중..." : "삭제"}
      </button>
      {state?.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
