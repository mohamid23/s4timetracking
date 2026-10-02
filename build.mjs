import * as esbuild from "esbuild";
import fs from "node:fs";

const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["src/app.jsx"],
  bundle: true,
  outfile: "dist/bundle.js",
  minify: !watch,
  sourcemap: watch,
  format: "iife",
  jsx: "automatic",
  loader: { ".jsx": "jsx" },
  define: { "process.env.NODE_ENV": watch ? '"development"' : '"production"' },
  logLevel: "info",
});

fs.mkdirSync("dist", { recursive: true });

if (watch) {
  await ctx.watch();
  const { host, port } = await ctx.serve({ servedir: "dist", port: 8080 });
  fs.copyFileSync("src/index.html", "dist/index.html");
  console.log(`dev server: http://${host}:${port}`);
} else {
  await ctx.rebuild();
  await ctx.dispose();
  fs.copyFileSync("src/index.html", "dist/index.html");
  console.log("build complete -> dist/");
}
