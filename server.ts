import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import app, { initTablesIfConnected } from "./src/server/app";

const PORT = 3000;

async function startServer() {
  // Jalankan cek inisialisasi tabel MySQL di latar belakang
  initTablesIfConnected().catch((err) => console.error("MySQL Table Init Error:", err));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server API & Frontend PKL berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
