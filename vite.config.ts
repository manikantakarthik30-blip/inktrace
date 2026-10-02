import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: { port: 5173 },
  plugins: [tailwindcss(), tanstackStart(), viteReact(), nitro({ preset: "node-server" })],
});
