//Importa el módulo sqlite3 y activa el modo verbose, que proporciona más información útil para depuración de errores.
const sqlite3 = require('sqlite3').verbose();

/*Crea una conexión con la base de datos usuarios.db. 
Si hay un error en la conexión, lo muestra en la consola; 
si no, imprime un mensaje de éxito.*/
const db = new sqlite3.Database('./db/usuarios.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Conectado a la base de datos SQLite.');
});
/*Usa serialize para ejecutar las consultas secuencialmente. 
Esta consulta SQL crea una tabla usuarios con cuatro columnas: id, nombre, password y imagen. 
Si la tabla ya existe, no se recrea. */
// Crear la tabla de usuarios si no existe
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      password TEXT NOT NULL,
      imagen TEXT
    )
  `);
});
//Exporta la base de datos db para que pueda ser utilizada en otros archivos.
module.exports = db;
