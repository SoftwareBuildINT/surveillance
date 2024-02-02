

const express = require('express');
const mysql = require('mysql2');

const app = express();
const port = 3000;

// Create a MySQL connection
const connection = mysql.createPool({
  host: '3.7.158.221',
  user: 'admin_buildINT',
  password: 'buildINT@2023$',
  database: 'serveillance'
});

// Connect to the database
connection.getConnection((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to the database');
});

// Define the API endpoint for updating incident details using POST method
app.post('/update-incident', (req, res) => {
  const updateQuery = `
    UPDATE IncidentDetail
    SET AlertType = '1'
    WHERE IncidentName = 'door';
  `;

  // Execute the update query
  connection.query(updateQuery, (err, result) => {
    if (err) {
      console.error('Error updating incident details:', err);
      res.status(500).send('Internal Server Error');
    } else {
      console.log('Incident details updated successfully');
      res.status(200).send('Incident details updated successfully');
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
