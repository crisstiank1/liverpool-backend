// server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise'; 

// Cargar variables de entorno del archivo .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); 
app.use(express.json());

// Configuración de la conexión a la base de datos
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

// Función para obtener la conexión a la DB
async function getConnection() {
    return await mysql.createConnection(dbConfig);
}

// ----------------------------------------------------------------
// 1 & 4. Endpoints: /api/players y /api/players?position=... (Filtrado Optimizada)
// ----------------------------------------------------------------
app.get('/api/players', async (req, res) => {
    const positionFilter = req.query.position; 
    let sql = 'SELECT id, name, position, jersey_number, nationality, age, photo_url FROM players';
    const params = [];

    // Lógica de filtrado: busca la categoría amplia (ej. 'Defensa') dentro de 
    // la posición detallada de la DB (ej. 'Defensa Central')
    if (positionFilter) {
        if (positionFilter === 'Portero') {
             sql += ' WHERE position = ?';
             params.push('Portero');
        } else {
             // Usa LIKE %palabra_clave% para filtrar las subcategorías
             sql += ' WHERE position LIKE ?';
             params.push(`%${positionFilter}%`); 
        }
    }
    
    sql += ' ORDER BY jersey_number ASC';

    try {
        const connection = await getConnection();
        const [rows] = await connection.execute(sql, params);
        connection.end();

        // El frontend espera { data: [...] }
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener jugadores:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor al cargar jugadores' });
    }
});


// ----------------------------------------------------------------
// 2. Endpoint: /api/club-info
// ----------------------------------------------------------------
app.get('/api/club-info', async (req, res) => {
    const sql = 'SELECT club_name, motto, founded_year, stadium, logo_url FROM club_info LIMIT 1';

    try {
        const connection = await getConnection();
        const [rows] = await connection.execute(sql);
        connection.end();
        // El frontend espera el objeto del club
        res.json({ success: true, data: rows[0] || null });
    } catch (error) {
        console.error('Error al obtener info del club:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor al cargar info del club' });
    }
});


// ----------------------------------------------------------------
// 3. Endpoint: /api/stats
// ----------------------------------------------------------------
app.get('/api/stats', async (req, res) => {
    const sqlTotal = 'SELECT COUNT(id) AS total_players FROM players';
    const sqlAge = 'SELECT AVG(age) AS average_age FROM players';
    const sqlNationalities = 'SELECT COUNT(DISTINCT nationality) AS total_nationalities FROM players';

    try {
        const connection = await getConnection();
        
        // Ejecutar las consultas
        const [totalRes] = await connection.execute(sqlTotal);
        const [ageRes] = await connection.execute(sqlAge);
        const [natRes] = await connection.execute(sqlNationalities);
        
        connection.end();

        const totalPlayers = totalRes[0].total_players;
        const averageAge = parseFloat(ageRes[0].average_age).toFixed(1); 
        const totalNationalities = natRes[0].total_nationalities;

        const statsData = {
            total_players: totalPlayers,
            average_age: averageAge,
            // Simula la estructura del array para que el contador de nacionalidades funcione
            nationalities_distribution: Array(totalNationalities).fill({}), 
        };

        // El frontend espera el objeto de estadísticas
        res.json({ success: true, data: statsData });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor al cargar estadísticas' });
    }
});


// ----------------------------------------------------------------
// Inicialización del servidor
// ----------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express con MySQL corriendo en http://localhost:${PORT}`);
});