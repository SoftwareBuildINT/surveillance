const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
app.use(bodyParser.json());
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

app.post('/addsite', (req, res) => {
  // Check if the user has the required roles to perform this action
  

  const {
    AtmId, BranchName, Client, SubClient,
    City,
    State,
    PanelMake,
    PanelType,
    PanelMacId,
    DvrMake,
    Communication,
    Latitude,
    Longitude,
    RouterIp,
    PoliceContact,
    HospitalContact,
    FireBrigadeContact,
    MseName,
    MseEmail,
    MseContact,
    Region
  } = req.body;

  // Check if the record with the given AtmId already exists
  const checkIfExistsSQL = 'SELECT * FROM SiteDetail WHERE AtmId = ?';
  connection.query(checkIfExistsSQL, [AtmId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking if record exists in MySQL:', checkErr);
      return res.status(500).json({ message: 'Error checking if record exists in the database.' });
    }

    if (checkResults.length > 0) {
      // If the record exists, update it
      const updateSQL = `UPDATE SiteDetail SET
        BranchName = ?,
        Client = ?,
        SubClient = ?,
        City = ?,
        State = ?,
        PanelMake = ?,
        PanelType = ?,
        PanelMacId = ?,
        DvrMake = ?,
        Communication = ?,
        Latitude = ?,
        Longitude = ?,
        RouterIp = ?,
        PoliceContact = ?,
        HospitalContact = ?,
        FireBrigadeContact = ?,
        MseName = ?,
        MseEmail = ?,
        MseContact = ?,
        Region = ?
        WHERE AtmId = ?`;

      const updateValues = [
        BranchName,
        Client,
        SubClient,
        City,
        State,
        PanelMake,
        PanelType,
        PanelMacId,
        DvrMake,
        Communication,
        Latitude,
        Longitude,
        RouterIp,
        PoliceContact,
        HospitalContact,
        FireBrigadeContact,
        MseName,
        MseEmail,
        MseContact,
        Region,
        AtmId
      ];

      connection.query(updateSQL, updateValues, (updateErr, updateResults) => {
        if (updateErr) {
          console.error('Error updating data in MySQL:', updateErr);
          return res.status(500).json({ message: 'Error updating data in the database.' });
        }

        return res.json({ message: 'Item updated successfully' });
      });
    } else {
      // If the record doesn't exist, insert a new one
      const insertSQL = `INSERT INTO SiteDetail(
        AtmId,
        BranchName,
        Client,
        SubClient,
        City,
        State,
        PanelMake,
        PanelType,
        PanelMacId,
        DvrMake,
        Communication,
        Latitude,
        Longitude,
        RouterIp,
        PoliceContact,
        HospitalContact,
        FireBrigadeContact,
        MseName,
        MseEmail,
        MseContact,
        Region
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const insertValues = [
        AtmId,
        BranchName,
        Client,
        SubClient,
        City,
        State,
        PanelMake,
        PanelType,
        PanelMacId,
        DvrMake,
        Communication,
        Latitude,
        Longitude,
        RouterIp,
        PoliceContact,
        HospitalContact,
        FireBrigadeContact,
        MseName,
        MseEmail,
        MseContact,
        Region
      ];

      connection.query(insertSQL, insertValues, (insertErr, insertResults) => {
        if (insertErr) {
          console.error('Error inserting data into MySQL:', insertErr);
          return res.status(500).json({ message: 'Error inserting data into the database.' });
        }

        return res.json({ message: 'Item added successfully' });
      });
    }
  });
});



app.post('/update-incident', (req, res) => {
  // Call the stored procedure
  connection.query('CALL UpdateAllIncidents()', (err, result) => {
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
