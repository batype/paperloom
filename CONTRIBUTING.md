# Contributing

Use Node.js 24, `npm ci`, `npm test` and `npm run build`.

Keep parsing and export logic in `src/core`, independent of React. Treat document content as untrusted. Do not enable raw HTML, remote image fetching, or server uploads as an incidental refactor. Add focused regression cases for rendering or export changes, and visually inspect actual PDFs when changing layout.

For bugs, provide a small synthetic Markdown fixture, browser details, expected format and expected/actual behavior. Never include credentials or sensitive documents. Keep third-party notices and font licenses with distributed assets.
