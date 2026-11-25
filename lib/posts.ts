import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";

const DATA_FILE = path.join(process.cwd(), "data", "posts.json");
const BLOB_PATH = "board/posts.json";

// Vercel Blob 토큰이 있으면(=배포 환경) Blob에, 없으면(=내 컴퓨터) 파일에 저장
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

type StoredPost = {
  id: number;
  author: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  salt: string;
  passwordHash: string;
};

// 화면에 넘겨도 안전한 형태 (비밀번호 정보 제외)
export type Post = Omit<StoredPost, "salt" | "passwordHash">;

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function toPublic(p: StoredPost): Post {
  return {
    id: p.id,
    author: p.author,
    title: p.title,
    content: p.content,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ---------- 저장소 (파일 / Blob) ----------

type Snapshot = { posts: StoredPost[]; etag: string | null };

function parsePosts(raw: string): StoredPost[] {
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function load(): Promise<Snapshot> {
  if (useBlob) {
    const res = await get(BLOB_PATH, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return { posts: [], etag: null };
    const raw = await new Response(res.stream).text();
    return { posts: parsePosts(raw), etag: res.blob.etag };
  }
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return { posts: parsePosts(raw), etag: null };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      return { posts: [], etag: null };
    throw e;
  }
}

async function save(posts: StoredPost[], etag: string | null) {
  const body = JSON.stringify(posts, null, 2);
  if (useBlob) {
    // etag가 있으면 "내가 읽은 뒤 아무도 안 바꿨을 때만" 저장 (동시 작성 보호)
    await put(BLOB_PATH, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
    });
    return;
  }
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  await fs.writeFile(tmp, body, "utf-8");
  await fs.rename(tmp, DATA_FILE);
}

// 같은 서버 안에서는 순서대로, 다른 서버와 겹치면 다시 읽어서 재시도
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(
  fn: (posts: StoredPost[]) => { posts: StoredPost[] | null; result: T },
): Promise<T> {
  const run = queue.then(async () => {
    for (let attempt = 0; ; attempt++) {
      const { posts, etag } = await load();
      const out = fn(posts);
      if (!out.posts) return out.result; // 변경 없음
      try {
        await save(out.posts, etag);
        return out.result;
      } catch (e) {
        const conflict =
          e instanceof BlobPreconditionFailedError || (useBlob && !etag);
        if (!useBlob || !conflict || attempt >= 4) throw e;
      }
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

function checkPassword(post: StoredPost, password: string) {
  const a = Buffer.from(hashPassword(password, post.salt), "hex");
  const b = Buffer.from(post.passwordHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- 게시물 기능 ----------

export async function listPosts(): Promise<Post[]> {
  const { posts } = await load();
  return posts.map(toPublic).sort((a, b) => b.id - a.id);
}

export async function getPost(id: number): Promise<Post | null> {
  const { posts } = await load();
  const found = posts.find((p) => p.id === id);
  return found ? toPublic(found) : null;
}

export function createPost(input: {
  author: string;
  password: string;
  title: string;
  content: string;
}): Promise<Post> {
  return mutate((posts) => {
    const salt = randomBytes(16).toString("hex");
    const post: StoredPost = {
      id: posts.reduce((m, p) => Math.max(m, p.id), 0) + 1,
      author: input.author,
      title: input.title,
      content: input.content,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      salt,
      passwordHash: hashPassword(input.password, salt),
    };
    return { posts: [...posts, post], result: toPublic(post) };
  });
}

export type MutationResult = "ok" | "not_found" | "wrong_password";

export function updatePost(
  id: number,
  password: string,
  input: { author: string; title: string; content: string },
): Promise<MutationResult> {
  return mutate<MutationResult>((posts) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return { posts: null, result: "not_found" };
    if (!checkPassword(post, password))
      return { posts: null, result: "wrong_password" };
    const updated: StoredPost = {
      ...post,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    return {
      posts: posts.map((p) => (p.id === id ? updated : p)),
      result: "ok",
    };
  });
}

export function deletePost(
  id: number,
  password: string,
): Promise<MutationResult> {
  return mutate<MutationResult>((posts) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return { posts: null, result: "not_found" };
    if (!checkPassword(post, password))
      return { posts: null, result: "wrong_password" };
    return { posts: posts.filter((p) => p.id !== id), result: "ok" };
  });
}
