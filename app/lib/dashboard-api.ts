const API = process.env.NEXT_PUBLIC_API_URL;

export function getApiBaseUrl(): string | undefined {
  return API;
}

export function getApiUrl(path: string): string {
  if (!API) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return `${API}${path}`;
}

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(getApiUrl(path), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}
