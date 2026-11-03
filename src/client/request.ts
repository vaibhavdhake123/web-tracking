export class TrackingRequestError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TrackingRequestError";
    if (status !== undefined) this.status = status;
  }
}

export async function request<T>(
  fetchImplementation: typeof globalThis.fetch,
  url: string,
  payload: unknown,
  timeoutMs: number,
  token: string,
  keepalive = false,
): Promise<T | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImplementation(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Web-Tracking-Token": token,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      mode: "cors",
      credentials: "omit",
      keepalive,
    });
    if (!response.ok) {
      throw new TrackingRequestError(
        `Tracking request failed with status ${response.status}.`,
        response.status,
      );
    }
    const text = await response.text();
    if (!text.trim()) return undefined;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new TrackingRequestError(
        "Tracking endpoint returned invalid JSON.",
      );
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new TrackingRequestError("Tracking request timed out.");
    }
    if (error instanceof TrackingRequestError) throw error;
    throw new TrackingRequestError("Tracking request could not be completed.");
  } finally {
    clearTimeout(timeout);
  }
}
