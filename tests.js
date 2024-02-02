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
  const {incidentName} = req.body;

  let updateQuery;

  if (incidentName === 'door') {
    updateQuery = `
      UPDATE IncidentDetail
      SET AlertType = '1'
      WHERE IncidentName = 'door';
    `;
  } else if (incidentName === 'motion') {
    updateQuery = `
      UPDATE IncidentDetail
      SET AlertType = '2'
      WHERE IncidentName = 'motion';
    `;
  } else {
    return res.status(400).send('Invalid IncidentName');
  }
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


app.get('/site-list', async (req, res) => {
  const SiteId = req.query.SiteId; // Assuming SiteId is in the query parameters

  if (!SiteId) {
    return res.status(400).json({ error: 'SiteId is required.' });
  }

  try {
    const results = await executeQuery(SiteId);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Site not found.' });
    }

    res.json(results);
  } catch (err) {
    console.error('Error executing MySQL query: ' + err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function executeQuery(SiteId) {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT SiteDetail.*, City.CityId, City.CityName, State.StateId, State.StateName, Region.RegionName FROM SiteDetail JOIN City ON SiteDetail.City = City.CityId JOIN State ON SiteDetail.State = State.StateId JOIN Region ON SiteDetail.Region = Region.RegionId';
    connection.query(sql, [SiteId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

app.get('/org/list', (req, res) => {

  connection.query(`
  SELECT concat(MangFName,' ',MangLName) as OrgName,MangFName,MangLName,MangEmail, Mangcontact,SubClient,CreatedBy FROM Organization;
`, (error, results) => {
    if (error) {
      console.error('Error retrieving Users details:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.json(results);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
