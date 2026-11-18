export type Result<T> = { isOk: true; data: T } | { isOk: false; error: string };

async function failureOf(res: Response): Promise<{ isOk: false; error: string }> {
  const body = await res.json().catch(() => ({}));
  return { isOk: false, error: body?.error ?? "Erreur serveur" };
}

export async function handleResponse<T>(res: Response): Promise<Result<T>> {
  if (!res.ok) return failureOf(res);
  const data = (await res.json()) as T;
  return { isOk: true, data };
}

/** Pour une réponse 204 sans corps, que `handleResponse` ne saurait pas lire. */
export async function handleEmptyResponse(res: Response): Promise<Result<null>> {
  if (!res.ok) return failureOf(res);
  return { isOk: true, data: null };
}
