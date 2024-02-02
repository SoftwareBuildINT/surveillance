const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const port = 3000;

const app = express();

const connection = mysql.createPool({
  host: '3.7.158.221',
  user: 'admin_buildINT',
  password: 'buildINT@2023$',
  database: 'serveillance',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// Express route for handling GET request to '/checkIncidentName'
app.put('/updateIncident', (req, res) => {
  const newAlertType = '1'; // Replace with your new alert type

  const sql = `UPDATE IncidentDetail SET AlertType = ?`;
  const values = [newAlertType];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error updating database:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    console.log('Database updated successfully');
    res.status(200).json({ message: 'Database updated successfully' });
  });
});


// Route for updating the status based on the provided query
app.get('/update_status', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM LatestData WHERE AtmId = ?', [req.query.AtmId]);

    if (results.length > 0) {
      const latestData = results[0];

      const status = (TIMESTAMPDIFF(MINUTE, latestData.PanelEvtDt, latestData.IstEvtDt) > 15) ? 'offline' : 'online';

      await pool.query('UPDATE SiteDetail SET Status = ? WHERE AtmId = ?', [status, req.query.AtmId]);
      return res.json({ success: true });
    } else {
      return res.status(404).json({ message: 'Latest data not found for the provided AtmId.' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
