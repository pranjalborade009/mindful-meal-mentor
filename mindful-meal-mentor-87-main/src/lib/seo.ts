export const pageMeta = (title: string, description: string) => ({
  meta: [
    { title: `${title} — NUTRIFY` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — NUTRIFY` },
    { property: "og:description", content: description },
  ],
});
