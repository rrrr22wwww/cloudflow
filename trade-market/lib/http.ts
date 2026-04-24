export async function postJson<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error((payload as { message?: string } | null)?.message ?? "Request failed");
  }

  return payload as T;
}

export async function postFormData<T>(path: string, body: FormData) {
  const response = await fetch(path, {
    method: "POST",
    body,
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error((payload as { message?: string } | null)?.message ?? "Request failed");
  }

  return payload as T;
}
