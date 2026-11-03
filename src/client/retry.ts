export async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number,
  delayMs = 250,
  shouldRetry: (error: unknown) => boolean = () => true,
): Promise<T> {
  const boundedRetries = Math.max(0, Math.min(5, Math.floor(retries)));
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= boundedRetries || !shouldRetry(error)) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(delayMs * 2 ** attempt, 4_000)),
      );
      attempt += 1;
    }
  }
}
