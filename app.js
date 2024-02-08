const express = require('express');
const mysql = require('mysql2');
const randomstring = require('randomstring');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');

// const mysql = require('mysql2/promise');
const storage = multer.memoryStorage(); // Store the image in memory
const upload = multer({ storage: storage });


app.use(express.static('public'));
app.use(bodyParser.json());
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: 'Content-Type,Authorization',
};
app.use(cors());
app.use(cors(corsOptions));
const connection = mysql.createPool({
  host: '3.7.158.221',
  user: 'admin_buildINT',
  password: 'buildINT@2023$',
  database: 'serveillance',
});
app.use(express.json());
// Connect to the MySQL database
connection.getConnection((err) => {
  if (err) {
    console.error('Error connecting to MySQL database: ' + err.message);
    return;
  }
  console.log('Connected to MySQL database');

});
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, "secretkey", (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach the decoded user information to the request object for later use
    req.user_data = decoded;
    console.log(req.user_data)
    next();
  });
};


app.get('/profile', verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ['Admin', 'super admin', 'User'];

  if (!req.user_data || !req.user_data.role || !allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }

  // Continue with your existing logic to fetch profile from the database
  const userId = req.user_data.Id;

  console.log('User ID:', userId); // Log the user ID to check if it's correct

  const query = `SELECT Id, CONCAT(FirstName, ' ', LastName) AS fullname, role FROM login WHERE Id = ?;`;

  console.log('Query:', query); // Log the query string to check if it's correct

  connection.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error fetching profile:', err);
      res.status(500).json({ error: 'Error fetching profile' });
    } else {
      console.log('Result:', result); // Log the result to check what's being returned
      if (result.length > 0) {
        const profile = result[0];
        res.json(profile);
      } else {
        res.status(404).json({ error: 'Profile not found' });
      }
    }
  });
});
app.get('/checkStatus', (req, res) => {

  connection.query('SELECT SiteDetail.AtmID, LatestData.PanelEvtDt FROM SiteDetail JOIN LatestData ON SiteDetail.AtmID = LatestData.AtmID', (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    if (results.length > 0) {
      const currentTime = new Date();
      const fifteenMinutesInMillis = 15 * 60 * 1000;

      const panelonlineCount = results.reduce((count, result) => {
        const timeDifference = currentTime - result.PanelEvtDt;
        const isOnline = timeDifference <= fifteenMinutesInMillis;
        return count + (isOnline ? 1 : 0);
      }, 0);

      const panelofflineCount = results.length - panelonlineCount;

      const atmStatusList = results.map(result => {
        const timeDifference = currentTime - result.PanelEvtDt;
        const isOnline = timeDifference <= fifteenMinutesInMillis;
        return { AtmID: result.AtmID, status: isOnline ? 'online' : 'offline' };
      });

      const totalATMs = results.length;

      res.json({ totalATMs, panelonlineCount, panelofflineCount });
    } else {
      res.status(404).json({ error: 'Data not found' });
    }
  });
});

//user
app.delete('/delete-user/:Id', verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ['Admin', 'super admin', 'User'];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }

  const Id = req.params.Id; // Retrieve siteId from URL parameters
  console.log(Id)

  const sql = 'DELETE FROM login WHERE Id = ?;'; // Use parameterized query

  connection.query(sql, [Id], (err, results) => {
    if (err) {
      console.error('Error deleting user from MySQL:', err);
      return res.status(500).json({ message: 'Error deleting user from the database.' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found or already deleted.' });
    }

    // Respond with a success message
    return res.json({ message: 'User deleted successfully' });
  });
});

// side delete api
app.delete('/delete-site/:siteId', verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ['Admin', 'super admin', 'User'];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }

  const siteId = req.params.siteId; // Retrieve siteId from URL parameters
  console.log(siteId)

  // Define the SQL query to delete the site with the given ID
  const sql = 'DELETE FROM SiteDetail WHERE SiteId = ?;'; // Use parameterized query

  // Execute the SQL query with the specified site ID
  connection.query(sql, [siteId], (err, results) => {
    if (err) {
      console.error('Error deleting site from MySQL:', err);
      return res.status(500).json({ message: 'Error deleting site from the database.' });
    }

    // Check if any rows were affected (i.e., if the site was deleted)
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Site not found or already deleted.' });
    }

    // Respond with a success message
    return res.json({ message: 'Site deleted successfully' });
  });
});



app.post('/addUser', async (req, res) => {
  const { FirstName,LastName,EmailId, password, token, expiration_time, otp, role, Organization,ContactNo } = req.body;

  try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user data into the database
      connection.query(`INSERT INTO login (FirstName,LastName,EmailId, password, token, expiration_time, otp, role, Organization,ContactNo) VALUES (?,?, ?, ?, ?, ?, ?, ?,?,?)`, 
          [FirstName,LastName,EmailId, hashedPassword, token, expiration_time, otp, role,  Organization,ContactNo], function(err, result) {
          if (err) {
              console.error(err.message);
              res.status(500).json({ error: 'Failed to Add user.' });
          } else {
              console.log(`User with email ${EmailId} registered successfully.`);
              res.status(201).json({ message: 'User registered successfully.' });
          }
      });
  } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Failed to register user.' });
  }
});

app.post('/login', async (req, res) => {
  const { EmailId, password } = req.body;

  try {
      // Fetch user details from the database based on the provided email
      connection.query('SELECT * FROM login WHERE EmailId = ?', [EmailId], async (err, results) => {
          if (err) {
              console.error('Database error:', err);
              res.status(500).json({ error: 'Internal server error' });
              return;
          }

          if (results.length === 0) {
              res.status(401).json({ error: 'Invalid EmailId or password' });
              return;
          }

          const user = results[0];

          // Compare the provided password with the hashed password stored in the database
          const passwordMatch = await bcrypt.compare(password, user.password);
          if (!passwordMatch) {
              res.status(401).json({ error: 'Invalid EmailId or password' });
              return;
          }

          // User is authenticated; generate a JWT token
          const token = jwt.sign({ FirstName: user.FirstName,LastName:user.LastName, EmailId: user.EmailId, role: user.role ,Id:user.Id}, 'secretkey', {
              expiresIn: '1h', // Token expires in 1 hour
          });

          // Respond with the JWT token
          res.status(200).json({ token });
      });
  } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});
// Verify OTP and log in
app.post('/verify', (req, res) => {
  const { EmailId, otp } = req.body;

  // Check if the provided OTP matches the one in the database
  const query = 'SELECT * FROM login WHERE EmailId = ? AND otp = ?';
  connection.query(query, [EmailId, otp], (err, results) => {
    if (err) {
      console.error('Error checking OTP:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 0) {
      res.status(401).json({ error: 'Invalid OTP' });
      return;
    }
    const currentTime = new Date(); // get current Time
    const otpExpiretime = new Date(results[0].expiration_time);
    if (currentTime < otpExpiretime) {
      // OTP is valid; generate a JWT token
      const user = results[0];
      const token = jwt.sign(
        { EmailId: user.EmailId },
        'secretkey',
        {
          expiresIn: '1h', // Token expires in 1 hour
        }
      );

      // Update the database with the JWT token
      connection.query(
        'UPDATE login SET token = ? WHERE EmailId = ?',
        [token, EmailId],
        (updateErr) => {
          if (updateErr) {
            console.error(
              'Error updating JWT token in the database:',
              updateErr
            );
            res.status(500).json({
              error: 'Failed to update JWT token in the database',
            });
            return;
          }

          res.status(200).json({ token, role: results[0].role });
        }
      );
    } else {
      res.status(200).json({ error: 'OTP has expired' });
    }
  }
  );
});
// Request for forgot password
app.post('/forgot', (req, res) => {
  const { EmailId } = req.body;

  // Check if the user exists with the provided email
  connection.query('SELECT * FROM login WHERE EmailId = ?', [EmailId], (err, results) => {
    if (err) {
      console.error('Error checking user:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'User not found with this EmailId' });
      return;
    }

    // Generate a random OTP and set its expiration time
    const generatedOTP = randomstring.generate({ length: 6, charset: 'numeric' });
    const expirationTime = new Date(Date.now() + 600000); // OTP expires in 10 minutes

    // Update the database with the generated OTP and its expiration time
    connection.query(
      'UPDATE login SET otp = ?, expiration_time = ? WHERE EmailId = ?',
      [generatedOTP, expirationTime, EmailId],
      (updateErr) => {
        if (updateErr) {
          console.error('Error updating OTP in the database:', updateErr);
          res.status(500).json({ error: 'Failed to update OTP in the database' });
          return;
        }

        // Send the OTP to the user via email (you'll need to configure your nodemailer for this)
        const transporter = nodemailer.createTransport({
          host: 'smtp.rediffmailpro.com',
          port: 465,
          secure: true, // for SSL
          auth: {
            user: 'trainee.software@buildint.co',
            pass: 'BuildINT@123',
          },
        });


        const mailOptions = {
          from: 'trainee.software@buildint.co',
          to: EmailId,
          subject: 'Password Reset OTP',
          text: `Your OTP for password reset is: ${generatedOTP}`,
        };

        transporter.sendMail(mailOptions, (mailErr) => {
          if (mailErr) {
            console.error('Error sending OTP via email:', mailErr);
            res.status(500).json({ error: 'Failed to send OTP via email' });
            return;
          }

          res.status(200).json({ message: 'OTP sent to your email for password reset' });
        });
      }
    );
  });
});

app.post('/reset-password', async (req, res) => {
  const { EmailId, otp, newPassword, confirmNewPassword } = req.body;

  // Check if newPassword and confirmNewPassword match
  if (newPassword !== confirmNewPassword) {
      res.status(400).json({ error: 'New passwords do not match' });
      return;
  }

  try {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Check if the reset token matches the stored token for the user
      connection.query('SELECT * FROM login WHERE EmailId = ? AND otp = ?', [EmailId, otp], async (err, results) => {
          if (err) {
              console.error('Database error:', err);
              res.status(500).json({ error: 'Internal server error' });
              return;
          }

          if (results.length === 0) {
              res.status(404).json({ error: 'Invalid EmailId or OTP' });
              return;
          }

          // Update the password for the user
          connection.query('UPDATE login SET password = ? WHERE EmailId = ?', [hashedPassword, EmailId], (updateErr, updateResults) => {
              if (updateErr) {
                  console.error('Update error:', updateErr);
                  res.status(500).json({ error: 'Failed to update password in the database' });
                  return;
              }

              // Password updated successfully
              res.status(200).json({ message: 'Password updated successfully' });
          });
      });
  } catch (error) {
      console.error('Error hashing password:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/addsite', verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ['Admin', 'super admin', 'User'];
  const {
    SiteId,
    AtmID,
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
  } = req.body;

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }

  // Validate required fields
  // if (!SiteId || !AtmID || !BranchName || !Client || !SubClient || !City || !State ||
  //   !PanelMake || !PanelType || !PanelMacId || !DvrMake || !Communication ||
  //   !Latitude || !Longitude || !RouterIp || !PoliceContact || !HospitalContact ||
  //   !FireBrigadeContact || !MseName || !MseEmail || !MseContact || !Region) {
  //   return res.status(400).json({ error: 'All fields are required.' });
  // }

  // Check if the record with the given SiteId already exists
  const checkIfExistsSQL = 'SELECT * FROM SiteDetail WHERE SiteId = ?';
  connection.query(checkIfExistsSQL, [SiteId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking if record exists in MySQL:', checkErr);
      return res.status(500).json({ error: 'Error checking if record exists in the database.' });
    }

    if (checkResults.length > 0) {
      // If the record exists, update it
      const updateSQL = `UPDATE SiteDetail SET
        AtmID = ?,
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
        WHERE SiteId = ?`;

      const updateValues = [
        AtmID,
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
        SiteId
      ];

      connection.query(updateSQL, updateValues, (updateErr, updateResults) => {
        if (updateErr) {
          console.error('Error updating data in MySQL:', updateErr);
          return res.status(500).json({ error: 'Error updating data in the database.' });
        }

        return res.json({ message: 'Item updated successfully' });
      });
    } else {
      // If the record doesn't exist, insert a new one
      const insertSQL = `INSERT INTO SiteDetail(
        SiteId,
        AtmID,
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
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const insertValues = [
        SiteId,
        AtmID,
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
          return res.status(500).json({ error: 'Error inserting data into the database.' });
        }

        return res.json({ message: 'Item added successfully' });
      });
    }
  });
});


//INCIDENT



app.post('/incident', verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ['Admin', 'super admin','User'];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }
  const {
    Incidentno,Client,SubClient,AtmId,SiteName,IncidentName,OpenTime

  } = req.body;

  // Insert form data into the MySQL database
  const sql = `INSERT INTO SiteDetail(
    Incidentno,Client,SubClient,AtmId,SiteName,IncidentName,OpenTime
  ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    Incidentno,Client,SubClient,AtmId,SiteName,IncidentName,OpenTime
  ];

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error inserting data into MySQL:', err);
      return res.status(500).json({ message: 'Error inserting data into the database.' });
    }

    return res.json({ message: 'Item added successfully' });
  });
});
// Define the API endpoint for fetching specific incident
// app.post('/api/incidentsite', verifyToken, (req, res) => {
//   // Check if the user has the required roles to perform this action
//   const allowedRoles = ['admin', 'super admin'];

//   if (!allowedRoles.includes(req.user_data.role)) {
//     return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
//   }
//   const { Incidentno } = req.body;

//   // Perform the MySQL query to fetch specific incident
//   const sql = `
//     SELECT *
//     FROM IncidentDetail
//     WHERE id = ?
//   `;
//   const values = [Incidentno];

//   connection.query(sql, values, (err, results) => {
//     if (err) {
//       console.error('Error fetching data:', err);
//       res.status(500).json({ error: 'Internal Server Error' });
//       return;
//     }

//     if (results.length === 0) {
//       res.status(404).json({ message: 'Incident not found' });
//       return;
//     }

//     console.log('Incident fetched successfully');
//     res.status(200).json({ incident: results[0] });
//   });
// });
app.get('/get-incident',verifyToken, (req, res) => {
  const allowedRoles = ['Admin', 'super admin','User'];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }
  connection.query(`
  SELECT * FROM IncidentDetail
`, (error, results) => {
    if (error) {
      console.error('Error retrieving site details:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.json(results);
  });
});


// Define your API endpoint
app.get('/site-list', (req, res) => {
  // const allowedRoles = ['Admin', 'super admin','User'];

  // if (!allowedRoles.includes(req.user_data.role)) {
  //   return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  // }
  const SiteId = req.query.SiteId;

  // Use parameterized queries to prevent SQL injection
  let sql = `SELECT * FROM serveillance.SiteDetail AS ss 
	LEFT JOIN serveillance.Region AS re ON (ss.Region = re.RegionId) 
	LEFT JOIN serveillance.State AS st ON(ss.State = st.StateId)
    LEFT JOIN serveillance.City AS ci ON (ss.City = ci.CityId);`;
  let values = [];

  if (SiteId) {
    sql = `SELECT * FROM serveillance.SiteDetail AS ss 
    LEFT JOIN serveillance.Region AS re ON (ss.Region = re.RegionId) 
    LEFT JOIN serveillance.State AS st ON(ss.State = st.StateId)
    LEFT JOIN serveillance.City AS ci ON (ss.City = ci.CityId)
    WHERE SiteId = ?`;
  
    values = [SiteId];
  }

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing MySQL query: ' + err.stack);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json(results);
  });
});


app.get('/total-location',verifyToken, (req, res) => {
  const allowedRoles = ['Admin', 'super admin','User'];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }
  
  connection.query("SELECT COUNT(AtmID) as total_location FROM SiteDetail;", (error, results) => {
    if (error) {
      console.error('Error retrieving total number of Locations:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    const total_location = results[0].total_location;
    res.json({ total_location });
  });
});

app.get('/total-panel',verifyToken, (req, res) => {
  const allowedRoles = ['Admin', 'super admin','User'];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }
  
  connection.query("SELECT COUNT(PanelMake) as panelCount FROM  SiteDetail;", (error, results) => {
    if (error) {
      console.error('Error retrieving total number of Panel Count:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    const panelCount = results[0].panelCount;
    res.json({ panelCount });
  });
});

app.get('/total-router',verifyToken, (req, res) => {
  const allowedRoles = ['Admin', 'super admin','User'];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }
  
  connection.query("SELECT COUNT(RouterIp) as routerCount FROM  SiteDetail;", (error, results) => {
    if (error) {
      console.error('Error retrieving total number of Router:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    const routerCount = results[0].routerCount;
    res.json({ routerCount });
  });
});



app.get('/user-list', (req, res) => {

  connection.query(`
  SELECT Id,concat(FirstName,' ',LastName) as user_name,FirstName,LastName,EmailId, ContactNo,role,Organization, created_at  FROM login;
`, (error, results) => {
    if (error) {
      console.error('Error retrieving Users details:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.json(results);
  });
});

app.get('/api/regions',verifyToken, (req, res) => {
  const allowedRoles = ['Admin', 'super admin','User'];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }
  const regionId = req.query.regionId;

  // Use parameterized queries to prevent SQL injection
  let sql = 'SELECT RegionId, RegionName FROM Region';
  let values = [];

  if (regionId) {
    sql = 'SELECT RegionId, RegionName FROM Region WHERE RegionId = ?';
    values = [regionId];
  }

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing MySQL query: ' + err.stack);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json(results);
  });
});


app.get('/api/states', verifyToken, (req, res) => {
  const allowedRoles = ['Admin', 'super admin','User'];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }
  const stateId = req.query.RegionId;

  // Use parameterized queries to prevent SQL injection
  let sql = 'SELECT StateId, StateName FROM State';
  let values = [];

  if (stateId) {
    sql = 'SELECT StateId, StateName FROM State WHERE RegionId = ?';
    values = [stateId]; // Change RegionId to stateId
  }
  console.log(values)

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing MySQL query: ' + err.stack);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json(results);
  });
});
//addsyeekig
app.get('/api/cities',verifyToken, (req, res) => {
  const allowedRoles = ['Admin', 'super admin','User'];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }
  const stateId = req.query.StateId;

  // Use parameterized queries to prevent SQL injection
  let sql = 'SELECT CityId, CityName FROM City';
  let values = [];

  if (stateId) {
    sql = 'SELECT CityId, CityName FROM City WHERE StateId = ?';
    values = [stateId];
  }

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error executing MySQL query: ' + err.stack);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json(results);
  });
});

app.get('/org/list', (req, res) => {

  connection.query(`
  SELECT OrgId,OrgName, concat(MangFName,' ',MangLName) as MangName,MangEmail, Mangcontact,SubClient,CreatedBy FROM Organization WHERE IsActive = 1;
`, (error, results) => {
    if (error) {
      console.error('Error retrieving Users details:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.json(results);
  });
});

app.post('/api/upload', upload.single('uploadImage'), (req, res) => {
  const {
    OrgName,
    SubClient,
    MangFName,
    MangLName,
    Mangcontact,
    MangEmail,
 y,
  } = req.body;

  const imageBuffer = req.file ? req.file.buffer : null;

  // Insert data into the MySQL database
  const sql =
    'INSERT INTO Organization (OrgName, SubClient, MangFName, MangLName, Mangcontact, MangEmail, image) VALUES ( ?, ?, ?, ?, ?, ?, ?)';
  const values = [
    OrgName,
    SubClient,
    MangFName,
    MangLName,
    Mangcontact,
    MangEmail,

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
          MangEmail
        },
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

app.delete('/deleteclient/:OrgId', (req, res) => {
  // Check if the user has the required roles to perform this action
  
  const OrgId = req.params.OrgId; // Retrieve siteId from URL parameters

  const sql = 'DELETE FROM Organization WHERE OrgId = ?;'; // Use parameterized query

  connection.query(sql, [OrgId], (err, results) => {
    if (err) {
      
      console.error('Error deleting user from MySQL:', err);
      return res.status(500).json({ message: 'Error deleting user from the database.' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found or already deleted.' });
    }

    // Respond with a success message
    return res.json({ message: 'User deleted successfully' });
  });
});

app.get('/api/latestpanel/data', (req, res) => {
  // Use the pool to get a connection
  connection.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to database: ', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Execute a query to fetch data from LatestData table
    const query = 'SELECT * FROM LatestData';
    connection.query(query, (error, results) => {
      // Release the connection back to the pool
      connection.release();

      if (error) {
        console.error('Error executing query: ', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      // Send the fetched data as JSON response
      res.json({ latest_data: results });
    });
  });
});

app.get('/get-client', verifyToken, (req, res) => {
  const allowedRoles = ['Admin', 'super admin', 'User'];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res.status(403).json({ error: 'Permission denied. Insufficient role.' });
  }
  connection.query(`
  SELECT distinct(client) FROM IncidentDetail
`, (error, results) => {
    if (error) {
      console.error('Error retrieving site details:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.json(results);
  });
});

// Logout route
app.post('/logout', (req, res) => {
  // Clear the JWT token from the client-side storage
  res.clearCookie('token'); // Assuming the JWT token is stored in a cookie named 'jwtToken'

  // Respond with a success message
  res.status(200).json({ message: 'Logout successful' });
});


app.listen(3328, () => {
  console.log('Server is running on port 3328');
});
