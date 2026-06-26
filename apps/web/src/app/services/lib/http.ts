export type Result<T> = { isOk: true; data: T } | { isOk: false; error: string };

export async function handleResponse<T>(res: Response): Promise<Result<T>> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { isOk: false, error: body?.error ?? "Erreur serveur" };
  }
  const data = (await res.json()) as T;
  return { isOk: true, data };
}
