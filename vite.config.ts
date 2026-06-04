import { defineConfig } from "vite";

export default defineConfig({
  base: "/RubiksEversionV2/",
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  test: {
    environment: "node",
  },
});
