const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Configure MySQL connection
const connection = mysql.createPool({
  host: '3.7.158.221',
  user: 'admin_buildINT',
  password: 'buildINT@2023$',
  database: 'serveillance',
});

// Connect to MySQL
connection.getConnection(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

// Define the API endpoint for fetching specific incident
app.post('/api/incidents', (req, res) => {
  const { Incidentno } = req.body;

  // Perform the MySQL query to fetch specific incident
  const sql = `
    SELECT *
    FROM IncidentDetail
    WHERE id = ?
  `;
  const values = [Incidentno];

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ message: 'Incident not found' });
      return;
    }

    console.log('Incident fetched successfully');
    res.status(200).json({ incident: results[0] });
  });
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
