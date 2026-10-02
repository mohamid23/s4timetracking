import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const p = (...parts) => path.join(ROOT, ...parts);

const watch = process.argv.includes("--watch");

const appCtx = await esbuild.context({
  entryPoints: [p("src/app.jsx")],
  bundle: true,
  outfile: p("dist/bundle.js"),
  minify: !watch,
  sourcemap: watch,
  format: "iife",
  jsx: "automatic",
  loader: { ".jsx": "jsx" },
  define: { "process.env.NODE_ENV": watch ? '"development"' : '"production"' },
  logLevel: "info",
});

// pdf.js needs its parser running off the main thread; it ships its own worker
// entry point, which we bundle separately and serve as a plain static file so
// GlobalWorkerOptions.workerSrc can point at a real URL.
const workerCtx = await esbuild.context({
  entryPoints: [p("node_modules/pdfjs-dist/build/pdf.worker.mjs")],
  bundle: true,
  outfile: p("dist/pdf.worker.js"),
  minify: !watch,
  format: "iife",
  logLevel: "info",
});

fs.mkdirSync(p("dist"), { recursive: true });

if (watch) {
  await appCtx.watch();
  await workerCtx.watch();
  const { host, port } = await appCtx.serve({ servedir: p("dist"), port: 8080 });
  fs.copyFileSync(p("src/index.html"), p("dist/index.html"));
  console.log(`dev server: http://${host}:${port}`);
} else {
  await appCtx.rebuild();
  await workerCtx.rebuild();
  await appCtx.dispose();
  await workerCtx.dispose();
  fs.copyFileSync(p("src/index.html"), p("dist/index.html"));
  console.log("build complete -> dist/");
}
