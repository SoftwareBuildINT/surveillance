const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const app = express();
const port = 3000;

// MySQL database configuration
const connection = mysql.createPool({
  host: '3.7.158.221',
  user: 'admin_buildINT',
  password: 'buildINT@2023$',
  database: 'serveillance',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

connection.getConnection((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

// Multer configuration for handling file uploads
const storage = multer.memoryStorage(); // Store the image in memory
const upload = multer({ storage: storage });

// Express middleware to parse JSON in the request body
app.use(express.json());

// API endpoint for handling POST requests
app.post('/api/upload', upload.single('uploadImage'), (req, res) => {
  const {
    OrgName,
    SubClient,
    MangFName,
    MangLName,
    Mangcontact,
    MangEmail,
    IsActive,
    CreatedBy,
  } = req.body;

  const imageBuffer = req.file ? req.file.buffer : null;

  // Insert data into the MySQL database
  const sql =
    'INSERT INTO Organization (OrgName, SubClient, MangFName, MangLName, Mangcontact, MangEmail, IsActive, CreatedBy, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const values = [
    OrgName,
    SubClient,
    MangFName,
    MangLName,
    Mangcontact,
    MangEmail,
    IsActive,
    CreatedBy,
    imageBuffer,
  ];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error inserting data into the database:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } else {
      console.log('Data inserted into the database:', result);
      res.json({
        success: true,
        message: 'Data received and inserted into the database successfully',
        data: {
          OrgName,
          SubClient,
          MangFName,
          MangLName,
          Mangcontact,
          MangEmail,
          IsActive,
          CreatedBy,
        },
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
