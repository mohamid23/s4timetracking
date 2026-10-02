import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const p = (...parts) => path.join(ROOT, ...parts);

const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
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

fs.mkdirSync(p("dist"), { recursive: true });

if (watch) {
  await ctx.watch();
  const { host, port } = await ctx.serve({ servedir: p("dist"), port: 8080 });
  fs.copyFileSync(p("src/index.html"), p("dist/index.html"));
  console.log(`dev server: http://${host}:${port}`);
} else {
  await ctx.rebuild();
  await ctx.dispose();
  fs.copyFileSync(p("src/index.html"), p("dist/index.html"));
  console.log("build complete -> dist/");
}
