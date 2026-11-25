import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const DATA_FILE = path.join(process.cwd(), "data", "posts.json");

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

async function readAll(): Promise<StoredPost[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function writeAll(posts: StoredPost[]) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(posts, null, 2), "utf-8");
  await fs.rename(tmp, DATA_FILE);
}

// 동시에 여러 요청이 파일을 고치다 내용이 섞이지 않도록 순서대로 처리
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

function checkPassword(post: StoredPost, password: string) {
  const a = Buffer.from(hashPassword(password, post.salt), "hex");
  const b = Buffer.from(post.passwordHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function listPosts(): Promise<Post[]> {
  const posts = await readAll();
  return posts.map(toPublic).sort((a, b) => b.id - a.id);
}

export async function getPost(id: number): Promise<Post | null> {
  const posts = await readAll();
  const found = posts.find((p) => p.id === id);
  return found ? toPublic(found) : null;
}

export function createPost(input: {
  author: string;
  password: string;
  title: string;
  content: string;
}): Promise<Post> {
  return serialize(async () => {
    const posts = await readAll();
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
    posts.push(post);
    await writeAll(posts);
    return toPublic(post);
  });
}

export type MutationResult = "ok" | "not_found" | "wrong_password";

export function updatePost(
  id: number,
  password: string,
  input: { author: string; title: string; content: string },
): Promise<MutationResult> {
  return serialize(async () => {
    const posts = await readAll();
    const post = posts.find((p) => p.id === id);
    if (!post) return "not_found";
    if (!checkPassword(post, password)) return "wrong_password";
    post.author = input.author;
    post.title = input.title;
    post.content = input.content;
    post.updatedAt = new Date().toISOString();
    await writeAll(posts);
    return "ok";
  });
}

export function deletePost(
  id: number,
  password: string,
): Promise<MutationResult> {
  return serialize(async () => {
    const posts = await readAll();
    const post = posts.find((p) => p.id === id);
    if (!post) return "not_found";
    if (!checkPassword(post, password)) return "wrong_password";
    await writeAll(posts.filter((p) => p.id !== id));
    return "ok";
  });
}
