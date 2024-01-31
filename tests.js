const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const port = 3000;

const pool  = mysql.createPool({
  host: '3.7.158.221',
  user: 'admin_buildINT',
  password: 'buildINT@2023$',
  database: 'serveillance',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


app.get('/check_status/:Atmid', async (req, res) => {
  const AtmId = req.params.Atmid;

  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query('SELECT * FROM LatestData WHERE AtmId = ?', [AtmId]);
    connection.release();

    if (result.length > 0) {
      const panelEvtDt = result[0].PanelEvtDt;
      const currentTime = new Date();

      // Check if the time difference is greater than 15 minutes
      const timeDifference = currentTime - panelEvtDt;
      const fifteenMinutesInMillis = 15 * 60 * 1000;

      if (timeDifference > fifteenMinutesInMillis) {
        res.json({ status: 'offline' });
      } else {
        res.json({ status: 'online' });
      }
    } else {
      res.status(404).json({ error: 'Data not found' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
