const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());

const connection = mysql.createPool({
  host: '3.7.158.221',
  user: 'admin_buildINT',
  password: 'buildINT@2023$',
  database: 'serveillance',
});

connection.getConnection((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to the database');
});

// Middleware to check if the user is a super admin
const isSuperAdmin = (req, res, next) => {
  if (req.body.role === 'super admin') {
    return res.status(403).json({ error: 'Super admins cannot be created by other users.' });
  }
  next();
};

const userExists = (req, res, next) => {
  const existingUser = users.find(user => user.username === req.body.username);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists.' });
  }
  next();
};

const isNotSuperAdmin = (req, res, next) => {
  if (req.body.role === 'super admin') {
    return res.status(403).json({ error: 'Regular admins cannot create super admins.' });
  }
  next();
};
// API endpoint to add a new user
app.post('/api/adduser', (req, res) => {
  const { username, password, role } = req.body;

  // TODO: Implement role-based access control here

  const sql = 'INSERT INTO login (username, password, role) VALUES (?, ?, ?)';
  connection.query(sql, [username, password, role], (err, result) => {
    if (err) {
      console.error('Error adding user:', err);
      res.status(500).send('Internal Server Error');
    } else {
      console.log('User added successfully');
      res.status(200).send('User added successfully');
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
