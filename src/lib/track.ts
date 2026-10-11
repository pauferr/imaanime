// Umami custom events (https://umami.is/docs/tracker-functions). A no-op when the script isn't loaded:
// dev, builds without UMAMI_WEBSITE_ID, or blocked by the visitor. Never send free text or personal data.
type Umami = { track: (event: string, data?: Record<string, string | number>) => void };

export const track = (event: string, data?: Record<string, string | number>) =>
  (window as unknown as { umami?: Umami }).umami?.track(event, data);
