const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const port = 3000;

module.exports = router;
const pool  = mysql.createPool({
  host: '3.7.158.221',
  user: 'admin_buildINT',
  password: 'buildINT@2023$',
  database: 'serveillance',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// New route for updating the status based on the provided query
// New route for updating the status based on the provided query
// New route for updating the status based on the provided query
app.get('/update_status', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    // Execute the provided MySQL update query
    await connection.query(`
      UPDATE SiteDetail
      JOIN LatestData ON SiteDetail.AtmID = LatestData.AtmId
      SET SiteDetail.Status = 
        CASE
          WHEN TIMESTAMPDIFF(MINUTE, (LatestData.PanelEvtDt), (LatestData.IstEvtDt)) > 15 THEN 'offline'
          WHEN TIMESTAMPDIFF(MINUTE, (LatestData.PanelEvtDt), (LatestData.IstEvtDt)) <= 15 THEN 'online'
        END
      WHERE LatestData.AtmId = ?
    `, [req.query.AtmId]); // Pass the ATM ID as a parameter
    connection.release();
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
;

app.get('/update_statuss', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    // Execute the provided MySQL update query
    await connection.query(`
     select AtmId 
    `, [req.query.AtmId]); // Pass the ATM ID as a parameter
    connection.release();
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Route to check the status of a specific ATM


const express = require('express');
const router = express.Router();
const pool = require('./your_database_connection'); // Import your database connection

// Define the API endpoint
app.get('/checkStatus/:AtmId', async (req, res) => {
  const AtmId = req.params.AtmId;

  try {
    const connection = await pool.getConnection();

    // Query to check if there's a match between SiteDetail.AtmID and LatestData.AtmID
    const [siteDetailResult] = await connection.query('SELECT * FROM SiteDetail WHERE AtmID = ?', [AtmId]);
    const [latestDataResult] = await connection.query('SELECT * FROM LatestData WHERE AtmId = ?', [AtmId]);

    connection.release();

    if (siteDetailResult.length > 0 && latestDataResult.length > 0) {
      const panelEvtDt = latestDataResult[0].PanelEvtDt;
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
