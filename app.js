const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('./db/database');
const bodyParser = require('body-parser');
const sharp = require('sharp');  // Módulo para optimización de imágenes
const fs = require('fs');  // Módulo para manejar el sistema de archivos

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // nombre único
  }
});

const upload = multer({ storage });

// Página de inicio que lista los usuarios
app.get('/', (req, res) => {
  db.all('SELECT * FROM usuarios', (err, rows) => {
    if (err) {
      console.error(err);
    }
    res.render('index', { usuarios: rows });
  });
});

// Formulario para agregar usuario
app.get('/add', (req, res) => {
  res.render('form', { usuario: {} });
});

// Añadir usuario
app.post('/add', upload.single('imagen'), (req, res) => {
  const { nombre, password } = req.body;
  const imagen = req.file ? `/uploads/${req.file.filename}` : null;

  // Optimización de la imagen si existe
  if (req.file) {
    const inputPath = req.file.path;
    const outputPath = `public/uploads/opt-${req.file.filename}`;
    
    sharp(inputPath)
      .resize(200, 200) // Cambiar el tamaño de la imagen
      .toFile(outputPath, (err) => {
        if (err) {
          console.error('Error al optimizar la imagen:', err);
        } else {
          // Elimina la imagen original y reemplaza por la optimizada
          fs.unlink(inputPath, (err) => {
            if (err) console.error('Error al eliminar imagen original:', err);
          });
          // Cambiar ruta de la imagen optimizada
          db.run('INSERT INTO usuarios (nombre, password, imagen) VALUES (?, ?, ?)', [nombre, password, `/uploads/opt-${req.file.filename}`], (err) => {
            if (err) {
              console.error(err);
            }
            res.redirect('/');
          });
        }
      });
  } else {
    db.run('INSERT INTO usuarios (nombre, password, imagen) VALUES (?, ?, ?)', [nombre, password, imagen], (err) => {
      if (err) {
        console.error(err);
      }
      res.redirect('/');
    });
  }
});

// Editar usuario
app.get('/edit/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
    }
    res.render('form', { usuario: row });
  });
});

// Actualizar usuario
app.post('/edit/:id', upload.single('imagen'), (req, res) => {
  const { nombre, password } = req.body;
  const id = req.params.id;
  const imagen = req.file ? `/uploads/${req.file.filename}` : null;

  if (req.file) {
    // Optimizar la nueva imagen si existe
    const inputPath = req.file.path;
    const outputPath = `public/uploads/opt-${req.file.filename}`;
    
    sharp(inputPath)
      .resize(200, 200) // Cambiar el tamaño de la imagen
      .toFile(outputPath, (err) => {
        if (err) {
          console.error('Error al optimizar la imagen:', err);
        } else {
          // Eliminar imagen anterior
          db.get('SELECT imagen FROM usuarios WHERE id = ?', [id], (err, row) => {
            if (row && row.imagen) {
              const oldImagePath = `public${row.imagen}`;
              fs.unlink(oldImagePath, (err) => {
                if (err) console.error('Error al eliminar imagen antigua:', err);
              });
            }
          });

          // Eliminar la imagen original y usar la optimizada
          fs.unlink(inputPath, (err) => {
            if (err) console.error('Error al eliminar imagen original:', err);
          });

          // Actualizar usuario en la base de datos
          db.run('UPDATE usuarios SET nombre = ?, password = ?, imagen = ? WHERE id = ?', [nombre, password, `/uploads/opt-${req.file.filename}`, id], (err) => {
            if (err) {
              console.error(err);
            }
            res.redirect('/');
          });
        }
      });
  } else {
    db.run('UPDATE usuarios SET nombre = ?, password = ? WHERE id = ?', [nombre, password, id], (err) => {
      if (err) {
        console.error(err);
      }
      res.redirect('/');
    });
  }
});

// Eliminar usuario y su imagen
app.get('/delete/:id', (req, res) => {
  const id = req.params.id;

  // Primero obtén la imagen del usuario
  db.get('SELECT imagen FROM usuarios WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.redirect('/');
    }

    // Si el usuario tiene una imagen, elimina el archivo
    if (row && row.imagen) {
      const imagePath = `public${row.imagen}`; // La ruta completa del archivo en el servidor

      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error('Error al eliminar la imagen:', err);
        } else {
          console.log('Imagen eliminada:', imagePath);
        }
      });
    }

    // Luego elimina el registro del usuario de la base de datos
    db.run('DELETE FROM usuarios WHERE id = ?', [id], (err) => {
      if (err) {
        console.error(err);
      }
      res.redirect('/');
    });
  });
});

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor iniciado en http://localhost:3000');
});
