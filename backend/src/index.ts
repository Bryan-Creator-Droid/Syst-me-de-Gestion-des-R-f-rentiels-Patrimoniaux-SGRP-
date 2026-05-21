import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (_, res) => {
  console.log("-> Quelqu'un a visité la racine de l'API !");
  res.send("API running");
});

// Ajout d'un console.log au démarrage
app.listen(PORT, () => {
  console.log(`🚀 Serveur Express démarré avec succès !`);
  console.log(`🌍 URL locale : http://localhost:${PORT}`);
});