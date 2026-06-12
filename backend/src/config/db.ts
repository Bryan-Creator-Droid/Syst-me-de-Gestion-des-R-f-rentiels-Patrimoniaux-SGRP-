import mysql from 'mysql2/promise';

// On crée un POOL de connexions, pas une connexion simple
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'sgrp_db',
  waitForConnections: true,
  connectionLimit: 10,   // max 10 connexions simultanées
  queueLimit: 0,
});

// Fonction de test de connexion — appelée au démarrage du serveur
export const testConnection = async (): Promise<void> => {
  try {
    const connection = await pool.getConnection();
    console.log('Connexion MySQL établie avec succès');
    connection.release(); // on libère immédiatement la connexion
  } catch (error) {
    console.error('Erreur de connexion MySQL :', error);
    process.exit(1); // si la BDD est inaccessible, on arrête tout
  }
};

export default pool;