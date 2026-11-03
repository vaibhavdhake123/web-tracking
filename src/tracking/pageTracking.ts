export function getCurrentPage() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { url: "", title: "", referrer: "" };
  }
  return {
    url: window.location.href,
    title: document.title,
    referrer: document.referrer,
  };
}
