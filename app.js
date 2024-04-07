const express = require("express");
const mysql = require("mysql2");
const moment = require("moment-timezone");
const net = require("net");
const randomstring = require("randomstring");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const app = express();
const { error } = require("console");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");

// const mysql = require('mysql2/promise');
const storage = multer.memoryStorage(); // Store the image in memory
const upload = multer({ storage: storage });

app.use(express.static("public"));
app.use(bodyParser.json());
const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: "Content-Type,Authorization",
};
app.use(cors());
app.use(cors(corsOptions));
const connection = mysql.createPool({
  host: "3.7.158.221",
  user: "admin_buildINT",
  password: "buildINT@2023$",
  database: "serveillance",
});
app.use(express.json());
// Connect to the MySQL database
connection.getConnection((err) => {
  if (err) {
    console.error("Error connecting to MySQL database: " + err.message);
    return;
  }
  console.log("Connected to MySQL database");
});
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return res.redirect(
      "http://127.0.0.1:5500/surveillance_uat/pages-login.html"
    );
  }

  jwt.verify(token, "secretkey", (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Attach the decoded user information to the request object for later use
    req.user_data = decoded;
    console.log(req.user_data);
    next();
  });
};

app.get("/profile", verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ["Admin", "super admin", "User"];

  if (
    !req.user_data ||
    !req.user_data.role ||
    !allowedRoles.includes(req.user_data.role)
  ) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  // Continue with your existing logic to fetch profile from the database
  const userId = req.user_data.Id;

  console.log("User ID:", userId); // Log the user ID to check if it's correct

  const query = `SELECT Id, CONCAT(FirstName, ' ', LastName) AS fullname, role FROM login WHERE Id = ?;`;

  console.log("Query:", query); // Log the query string to check if it's correct

  connection.query(query, [userId], (err, result) => {
    if (err) {
      console.error("Error fetching profile:", err);
      res.status(500).json({ error: "Error fetching profile" });
    } else {
      console.log("Result:", result); // Log the result to check what's being returned
      if (result.length > 0) {
        const profile = result[0];
        res.json(profile);
      } else {
        res.status(404).json({ error: "Profile not found" });
      }
    }
  });
});

app.get("/checkStatus", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  connection.query(
    "SELECT SiteDetail.AtmID, SiteDetail.BranchName, LatestData.ist_evt_dt FROM SiteDetail JOIN LatestData ON SiteDetail.SiteId = LatestData.SiteId;",
    (err, results) => {
      if (err) {
        console.error("Error querying database:", err);
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      if (results.length > 0) {
        const currentTime = new Date();
        const fifteenMinutesInMillis = 15 * 60 * 1000;

        const atmStatusList = results.map((result) => {
          const timeDifference = currentTime - result.ist_evt_dt;
          const isOnline = timeDifference <= fifteenMinutesInMillis;

          return {
            AtmID: result.AtmID,
            BranchName: result.BranchName,
            status: isOnline ? "online" : "offline",
            evt_dt: result.ist_evt_dt, // Include event date
          };
        });

        const onlineATMs = atmStatusList.filter(
          (atm) => atm.status === "online"
        );
        const offlineATMs = atmStatusList.filter(
          (atm) => atm.status === "offline"
        );

        const totalATMs = atmStatusList.length;
        const panelonlineCount = onlineATMs.length;
        const panelofflineCount = offlineATMs.length;

        res.json({
          totalATMs,
          panelonlineCount,
          panelofflineCount,
          onlineATMs,
          offlineATMs,
        });
      } else {
        res.status(404).json({ error: "Data not found" });
      }
    }
  );
});

//user
app.delete("/delete-user/:Id", verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  // const allowedRoles = ["Admin", "super admin", "User"];

  // if (!allowedRoles.includes(req.user_data.role)) {
  //   return res
  //     .status(403)
  //     .json({ error: "Permission denied. Insufficient role." });
  // }

  const Id = req.params.Id; // Retrieve siteId from URL parameters
  console.log(Id);

  const sql = "DELETE FROM login WHERE Id = ?;"; // Use parameterized query

  connection.query(sql, [Id], (err, results) => {
    if (err) {
      console.error("Error deleting user from MySQL:", err);
      return res
        .status(500)
        .json({ message: "Error deleting user from the database." });
    }

    if (results.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "User not found or already deleted." });
    }

    // Respond with a success message
    return res.json({ message: "User deleted successfully" });
  });
});

// side delete api
app.delete("/delete-site/:siteId", verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  const siteId = req.params.siteId; // Retrieve siteId from URL parameters
  console.log(siteId);

  // Define the SQL query to delete the site with the given ID
  const sql = "DELETE FROM SiteDetail WHERE SiteId = ?;"; // Use parameterized query

  // Execute the SQL query with the specified site ID
  connection.query(sql, [siteId], (err, results) => {
    if (err) {
      console.error("Error deleting site from MySQL:", err);
      return res
        .status(500)
        .json({ message: "Error deleting site from the database." });
    }

    // Check if any rows were affected (i.e., if the site was deleted)
    if (results.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Site not found or already deleted." });
    }

    // Respond with a success message
    return res.json({ message: "Site deleted successfully" });
  });
});

// Update site status
app.post("/update-status/:siteId/:status", verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  const siteId = req.params.siteId;
  const status = req.params.status; // Retrieve siteId from URL parameters
  console.log(siteId);
  console.log(status);

  let sql;

  if (status == "1") {
    sql = "UPDATE SiteDetail SET Status = 2 WHERE SiteId = ?;";
  } else if (status == "2") {
    sql = "UPDATE SiteDetail SET Status = 1 WHERE SiteId = ?;";
  }
  console.log(sql);

  // Execute the SQL query with the specified site ID
  connection.query(sql, [siteId], (err, results) => {
    if (err) {
      console.error("Error updating site from MySQL:", err);
      return res.status(500).json({ message: "Error updating status" });
    }

    // Check if any rows were affected (i.e., if the site was deleted)
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Site not found." });
    }

    // Respond with a success message
    return res.json({ message: "Status updated successfully" });
  });
});

app.post("/updateUser", async (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  // Check if the user making the request has the required role
  // if (!allowedRoles.includes(req.user_data.role)) {
  //   return res
  //     .status(403)
  //     .json({ error: "Permission denied. Insufficient role." });
  // }

  // Destructure request body to extract user data
  const { Id, FirstName, LastName, EmailId, role, Organization, ContactNo } =
    req.body;
  console.log(req.body);
  connection.query(
    `UPDATE login SET FirstName = ?, LastName = ?, EmailId = ?, role = ?, Organization = ?, ContactNo = ? WHERE Id = ?`,
    [FirstName, LastName, EmailId, role, Organization, ContactNo, Id],
    function (err, result) {
      if (err) {
        // Error handling for database query
        console.error(err.message);
        return res.status(500).json({ error: "Failed to update user." });
      } else {
        // Successful update response
        console.log(`User with email ${EmailId} updated successfully.`);
        return res.status(200).json({ message: "User updated successfully." });
      }
    }
  );
});

app.post("/addUser", async (req, res) => {
  // Destructure request body to extract user data
  const {
    FirstName,
    LastName,
    EmailId,
    password,
    role,
    Organization,
    ContactNo,
  } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the user data into the database
    connection.query(
      `INSERT INTO login (FirstName, LastName, EmailId, password, role, Organization, ContactNo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        FirstName,
        LastName,
        EmailId,
        hashedPassword,
        role,
        Organization,
        ContactNo,
      ],
      function (err, result) {
        if (err) {
          // Error handling for database query
          console.error(err.message);
          return res.status(500).json({ error: "Failed to add user." });
        } else {
          // Successful insertion response
          console.log(`User with email ${EmailId} registered successfully.`);
          return res
            .status(201)
            .json({ message: "User registered successfully." });
        }
      }
    );
  } catch (err) {
    // Error handling for hashing or other async operations
    console.error(err.message);
    return res.status(500).json({ error: "Failed to register user." });
  }
});

app.post("/login", async (req, res) => {
  const { EmailId, password } = req.body;

  try {
    // Fetch user details from the database based on the provided email
    connection.query(
      "SELECT * FROM login WHERE EmailId = ?",
      [EmailId],
      async (err, results) => {
        if (err) {
          console.error("Database error:", err);
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        if (results.length === 0) {
          res.status(401).json({ error: "Invalid EmailId or password" });
          return;
        }

        const user = results[0];

        // Compare the provided password with the hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          res.status(401).json({ error: "Invalid EmailId or password" });
          return;
        }

        // User is authenticated; generate a JWT token
        const token = jwt.sign(
          {
            FirstName: user.FirstName,
            LastName: user.LastName,
            EmailId: user.EmailId,
            role: user.role,
            Id: user.Id,
          },
          "secretkey",
          {
            expiresIn: "1h", // Token expires in 1 hour
          }
        );

        // Respond with the JWT token
        res.status(200).json({ token });
      }
    );
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Verify OTP and log in
app.post("/verify", (req, res) => {
  const { EmailId, otp } = req.body;

  // Check if the provided OTP matches the one in the database
  const query = "SELECT * FROM login WHERE EmailId = ? AND otp = ?";
  connection.query(query, [EmailId, otp], (err, results) => {
    if (err) {
      console.error("Error checking OTP:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    if (results.length === 0) {
      res.status(401).json({ error: "Invalid OTP" });
      return;
    }
    const currentTime = new Date(); // get current Time
    const otpExpiretime = new Date(results[0].expiration_time);
    if (currentTime < otpExpiretime) {
      // OTP is valid; generate a JWT token
      const user = results[0];
      const token = jwt.sign({ EmailId: user.EmailId }, "secretkey", {
        expiresIn: "1h", // Token expires in 1 hour
      });

      // Update the database with the JWT token
      connection.query(
        "UPDATE login SET token = ? WHERE EmailId = ?",
        [token, EmailId],
        (updateErr) => {
          if (updateErr) {
            console.error(
              "Error updating JWT token in the database:",
              updateErr
            );
            res.status(500).json({
              error: "Failed to update JWT token in the database",
            });
            return;
          }

          res.status(200).json({ token, role: results[0].role });
        }
      );
    } else {
      res.status(200).json({ error: "OTP has expired" });
    }
  });
});
// Request for forgot password
app.post("/forgot", (req, res) => {
  const { EmailId } = req.body;

  // Check if the user exists with the provided email
  connection.query(
    "SELECT * FROM login WHERE EmailId = ?",
    [EmailId],
    (err, results) => {
      if (err) {
        console.error("Error checking user:", err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      if (results.length === 0) {
        res.status(404).json({ error: "User not found with this EmailId" });
        return;
      }

      // Generate a random OTP and set its expiration time
      const generatedOTP = randomstring.generate({
        length: 6,
        charset: "numeric",
      });
      const expirationTime = new Date(Date.now() + 600000); // OTP expires in 10 minutes

      // Update the database with the generated OTP and its expiration time
      connection.query(
        "UPDATE login SET otp = ?, expiration_time = ? WHERE EmailId = ?",
        [generatedOTP, expirationTime, EmailId],
        (updateErr) => {
          if (updateErr) {
            console.error("Error updating OTP in the database:", updateErr);
            res
              .status(500)
              .json({ error: "Failed to update OTP in the database" });
            return;
          }

          // Send the OTP to the user via email (you'll need to configure your nodemailer for this)
          const transporter = nodemailer.createTransport({
            host: "smtp.rediffmailpro.com",
            port: 465,
            secure: true, // for SSL
            auth: {
              user: "trainee.software@buildint.co",
              pass: "BuildINT@123",
            },
          });

          const mailOptions = {
            from: "trainee.software@buildint.co",
            to: EmailId,
            subject: "Password Reset OTP",
            text: `Your OTP for password reset is: ${generatedOTP}`,
          };

          transporter.sendMail(mailOptions, (mailErr) => {
            if (mailErr) {
              console.error("Error sending OTP via email:", mailErr);
              res.status(500).json({ error: "Failed to send OTP via email" });
              return;
            }

            res
              .status(200)
              .json({ message: "OTP sent to your email for password reset" });
          });
        }
      );
    }
  );
});

app.post("/reset-password", async (req, res) => {
  const { EmailId, otp, newPassword, confirmNewPassword } = req.body;

  // Check if newPassword and confirmNewPassword match
  if (newPassword !== confirmNewPassword) {
    res.status(400).json({ error: "New passwords do not match" });
    return;
  }

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Check if the reset token matches the stored token for the user
    connection.query(
      "SELECT * FROM login WHERE EmailId = ? AND otp = ?",
      [EmailId, otp],
      async (err, results) => {
        if (err) {
          console.error("Database error:", err);
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        if (results.length === 0) {
          res.status(404).json({ error: "Invalid EmailId or OTP" });
          return;
        }

        // Update the password for the user
        connection.query(
          "UPDATE login SET password = ? WHERE EmailId = ?",
          [hashedPassword, EmailId],
          (updateErr, updateResults) => {
            if (updateErr) {
              console.error("Update error:", updateErr);
              res
                .status(500)
                .json({ error: "Failed to update password in the database" });
              return;
            }

            // Password updated successfully
            res.status(200).json({ message: "Password updated successfully" });
          }
        );
      }
    );
  } catch (error) {
    console.error("Error hashing password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Assuming you have a database connection named 'connection'

app.post("/addsite", verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

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
    Region,
    DVR,
    SiteAddress,
    QrtNo,
  } = req.body;

  const zones = [];
  for (let i = 1; i <= 32; i++) {
    const zoneInput = req.body[`Zone${i}Input`];
    const alert = req.body[`Alert${i}`];
    const alertName = req.body[`AlertName${i}`];

    // Check if zone data exists
    if (zoneInput && alert && alertName) {
      zones.push({
        zone_name: zoneInput,
        zone_alert_enable: `${alert},${alertName}`,
      });
    }
  }

  const checkIfExistsSQL = "SELECT * FROM SiteDetail WHERE SiteId = ?";
  connection.query(checkIfExistsSQL, [SiteId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Error checking if record exists in MySQL:", checkErr);
      return res
        .status(500)
        .json({ error: "Error checking if record exists in the database." });
    }

    if (checkResults.length > 0) {
      // If the record exists, update it

      // Generate the SET clause dynamically
      const setNameClause = zones
        .map((_, i) => `zone${i + 1}_name = ?`)
        .join(", ");

      const setAlertClause = zones
        .map((_, i) => `zone${i + 1}_alert_enable = ?`)
        .join(", ");

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
      Region = ?,
      QrtNo = ?,
      SiteAddress = ?,
      ${setNameClause},
      ${setAlertClause}

      WHERE SiteId = ?`;

      console.log(updateSQL);

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
        QrtNo,
        SiteAddress,
        ...zones.map((zone) => [zone.zone_name]).flat(),
        ...zones.map((zone) => [zone.zone_alert_enable]).flat(),
        SiteId,
      ];

      console.log(updateValues);

      connection.query(updateSQL, updateValues, (updateErr, updateResults) => {
        if (updateErr) {
          console.error("Error updating data in MySQL:", updateErr);
          return res
            .status(500)
            .json({ error: "Error updating data in the database." });
        }
        return res.json({ message: "Item updated successfully" });
      });
    } else {
      // If the record doesn't exist, insert a new one
      const insertSQL = `INSERT INTO SiteDetail (
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
        Region,
        QrtNo,
        SiteAddress,
        ${zones.map((_, i) => `zone${i + 1}_name`).join(", ")}, 
        ${zones.map((_, i) => `zone${i + 1}_alert_enable`).join(", ")}
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${Array(
      zones.length * 2
    )
      .fill("?")
      .join(", ")})`;

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
        Region,
        QrtNo,
        SiteAddress,
        ...zones.map((zone) => [zone.zone_name]).flat(),
        ...zones.map((zone) => [zone.zone_alert_enable]).flat(),
      ];

      connection.query(insertSQL, insertValues, (insertErr, insertResults) => {
        if (insertErr) {
          console.error("Error inserting data into MySQL:", insertErr);
          return res
            .status(500)
            .json({ error: "Error inserting data into the database." });
        }

        return res.json({ message: "Item added successfully" });
      });
    }
  });
});

//INCIDENT

app.post("/incident", verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }
  const {
    Incidentno,
    Client,
    SubClient,
    AtmId,
    SiteName,
    IncidentName,
    OpenTime,
  } = req.body;

  // Insert form data into the MySQL database
  const sql = `INSERT INTO SiteDetail(
    Incidentno,Client,SubClient,AtmId,SiteName,IncidentName,OpenTime
  ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    Incidentno,
    Client,
    SubClient,
    AtmId,
    SiteName,
    IncidentName,
    OpenTime,
  ];

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error("Error inserting data into MySQL:", err);
      return res
        .status(500)
        .json({ message: "Error inserting data into the database." });
    }

    return res.json({ message: "Item added successfully" });
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

// Incident details for incident page
app.get("/get-incidents", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  let query = `SELECT i1.*, o.OrgName as ClientName, o.SubClient as SubClientName
              FROM serveillance.IncidentDetail AS i1
              JOIN Organization o ON i1.Client = o.OrgId 
              WHERE (i1.AtmId, i1.IncidentName, i1.IncidentNo) IN (
                SELECT AtmId, IncidentName, MAX(IncidentNo)
                FROM serveillance.IncidentDetail
                GROUP BY AtmId, IncidentName
                )
              ORDER BY 1 DESC;`;

  // Check if specific type of incidents is requested
  if (req.query.type === "action") {
    query = `SELECT i1.*, o.OrgName as ClientName, o.SubClient as SubClientName
            FROM serveillance.IncidentDetail AS i1
            JOIN Organization o ON i1.Client = o.OrgId 
            WHERE i1.alert_status = 1 AND (i1.AtmId, i1.IncidentName, i1.IncidentNo) IN (
              SELECT AtmId, IncidentName, MAX(IncidentNo)
              FROM serveillance.IncidentDetail
              GROUP BY AtmId, IncidentName
              )
              ORDER BY 1 DESC;`;
  }


  connection.query(query, (error, results) => {
    if (error) {
      console.error("Error retrieving incident details:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(results);
  });
});
app.get("/incidentslive", (req, res) => {
  const incidentNo = req.query.incidentNo;
  const incident_name = req.query.incident_name;
  const atmId = incidentNo;
  console.log(incident_name);
  console.log(incidentNo);
  console.log(atmId);

  const sqlQuery = `
  SELECT 
    i.AtmId as AtmId,
    s.BranchName as branch_name,
    s.SiteAddress as address,
    i.IncidentNo as Incidentno,
    i.IstTimeStamp as opentime,
    i.IncidentName as alert,
    i.alert_status as action_status,
    i.Remark,
    o.OrgName as ClientName,
    o.SubClient as SubClientName,
    s.FireBrigadeContact as fire, 
    s.HospitalContact as hospital,
    s.PoliceContact as police 
  FROM 
    IncidentDetail i 
  JOIN 
    Organization o ON i.Client = o.OrgId 
  JOIN 
    SiteDetail s ON i.AtmId = s.AtmId  
  WHERE 
    i.AtmId = ?
    AND i.IncidentName = ?
  ORDER BY 
    Incidentno DESC;
 `;

  connection.query(sqlQuery, [atmId, incident_name], (error, results, fields) => {
    if (error) {
      console.error("Error executing SQL query:", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    res.json(results);
  });
});


// Warning priority for incident page
app.get("/incident-alerts", verifyToken, (req, res) => {
  // const allowedRoles = ["Admin", "super admin", "User"];

  // if (!allowedRoles.includes(req.user_data.role)) {
  //   return res
  //     .status(403)
  //     .json({ error: "Permission denied. Insufficient role." });
  // }
  connection.query(
    `SELECT 
      SUM(CASE WHEN alertType = 1 THEN 1 ELSE 0 END) AS critical,
      SUM(CASE WHEN alertType = 2 THEN 1 ELSE 0 END) AS warning,
      SUM(CASE WHEN alertType = 3 THEN 1 ELSE 0 END) AS medium
      FROM serveillance.IncidentDetail;`,
    (error, results) => {
      if (error) {
        console.error("Error retrieving site details:", error);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.json(results);
    }
  );
});

app.get("/panel-type/:id", (req, res) => {
  let id = req.params.id;
  let query = `SELECT * FROM serveillance.PanelType WHERE PanelTypeId = ?;`;

  connection.query(query, [id], (err, results) => {
    if (err) {
      console.log("Cannot get panel type");
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    res.json(results);
  });
});

// Define your API endpoint
app.get("/site-list", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }
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
      console.error("Error executing MySQL query: " + err.stack);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    res.json(results);
  });
});

app.get("/total-location", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  connection.query(
    "SELECT COUNT(AtmID) as total_location FROM SiteDetail WHERE Status = 1;",
    (error, results) => {
      if (error) {
        console.error("Error retrieving total number of Locations:", error);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      const total_location = results[0].total_location;
      res.json({ total_location });
    }
  );
});

app.get("/total-panel", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  connection.query(
    "SELECT COUNT(PanelMake) as panelCount FROM  SiteDetail  WHERE Status = 1;",
    (error, results) => {
      if (error) {
        console.error("Error retrieving total number of Panel Count:", error);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      const panelCount = results[0].panelCount;
      res.json({ panelCount });
    }
  );
});

app.get("/total-router", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  connection.query(
    "SELECT COUNT(RouterIp) as routerCount FROM  SiteDetail;",
    (error, results) => {
      if (error) {
        console.error("Error retrieving total number of Router:", error);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      const routerCount = results[0].routerCount;
      res.json({ routerCount });
    }
  );
});

app.get("/user-list", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  const Id = req.query.Id;
  let sql = `SELECT Id,concat(FirstName,' ',LastName) as user_name,FirstName,LastName,EmailId, ContactNo,role,Organization, created_at  FROM login;`;
  let values = [];

  if (Id) {
    sql = `SELECT Id,concat(FirstName,' ',LastName) as user_name,FirstName,LastName,EmailId, ContactNo,role,Organization, created_at FROM login WHERE Id = ?;`;
    values = [Id];
  }
  connection.query(sql, values, (error, results) => {
    if (error) {
      console.error("Error retrieving Users details:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    res.json(results);
  });
});

app.get("/api/regions", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }
  const regionId = req.query.regionId;

  // Use parameterized queries to prevent SQL injection
  let sql = "SELECT RegionId, RegionName FROM Region";
  let values = [];

  if (regionId) {
    sql = "SELECT RegionId, RegionName FROM Region WHERE RegionId = ?";
    values = [regionId];
  }

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error("Error executing MySQL query: " + err.stack);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    res.json(results);
  });
});

app.get("/api/states", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }
  const stateId = req.query.RegionId;

  // Use parameterized queries to prevent SQL injection
  let sql = "SELECT StateId, StateName FROM State";
  let values = [];

  if (stateId) {
    sql = "SELECT StateId, StateName FROM State WHERE RegionId = ?";
    values = [stateId]; // Change RegionId to stateId
  }
  console.log(values);

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error("Error executing MySQL query: " + err.stack);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    res.json(results);
  });
});
//addsyeekig
app.get("/api/cities", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }
  const stateId = req.query.StateId;

  // Use parameterized queries to prevent SQL injection
  let sql = "SELECT CityId, CityName FROM City";
  let values = [];

  if (stateId) {
    sql = "SELECT CityId, CityName FROM City WHERE StateId = ?";
    values = [stateId];
  }

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error("Error executing MySQL query: " + err.stack);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    res.json(results);
  });
});

app.get("/org/list", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  const OrgId = req.query.OrgId;
  let sql = `SELECT OrgId,OrgName, MangFName, MangLName, concat(MangFName,' ',MangLName) as MangName,MangEmail, Mangcontact,SubClient,CreatedBy FROM Organization WHERE IsActive = 1;`;
  let values = [];

  if (OrgId) {
    sql = `SELECT OrgId,OrgName, MangFName, MangLName, concat(MangFName,' ',MangLName) as MangName,MangEmail, Mangcontact,SubClient,CreatedBy FROM Organization WHERE IsActive = 1 AND OrgId =?`;
    values = [OrgId];
  }

  connection.query(sql, values, (error, results) => {
    if (error) {
      console.error("Error retrieving Users details:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    res.json(results);
  });
});

app.post(
  "/api/upload",
  upload.single("uploadImage"),
  verifyToken,
  (req, res) => {
    const allowedRoles = ["Admin", "super admin", "User"];

    if (!allowedRoles.includes(req.user_data.role)) {
      return res
        .status(403)
        .json({ error: "Permission denied. Insufficient role." });
    }

    const {
      OrgId,
      OrgName,
      SubClient,
      MangFName,
      MangLName,
      Mangcontact,
      MangEmail,
    } = req.body;

    const imageBuffer = req.file ? req.file.buffer : null;

    // Check if OrgId is provided to determine if it's an UPDATE or INSERT request
    if (OrgId) {
      // UPDATE request
      const sql =
        "UPDATE Organization SET OrgName = ?, SubClient = ?, MangFName = ?, MangLName = ?, Mangcontact = ?, MangEmail = ?, image = ? WHERE OrgId = ?";
      const values = [
        OrgName,
        SubClient,
        MangFName,
        MangLName,
        Mangcontact,
        MangEmail,
        imageBuffer,
        OrgId,
      ];

      connection.query(sql, values, (err, result) => {
        if (err) {
          console.error("Error updating data in the database:", err);
          res
            .status(500)
            .json({ success: false, message: "Internal server error" });
        } else {
          console.log("Data updated in the database:", result);
          res.json({
            success: true,
            message: "Data updated in the database successfully",
            data: {
              OrgId,
              OrgName,
              SubClient,
              MangFName,
              MangLName,
              Mangcontact,
              MangEmail,
            },
          });
        }
      });
    } else {
      // INSERT request
      const sql =
        "INSERT INTO Organization (OrgName, SubClient, MangFName, MangLName, Mangcontact, MangEmail, image) VALUES (?, ?, ?, ?, ?, ?, ?)";
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
          console.error("Error inserting data into the database:", err);
          res
            .status(500)
            .json({ success: false, message: "Internal server error" });
        } else {
          console.log("Data inserted into the database:", result);
          res.json({
            success: true,
            message:
              "Data received and inserted into the database successfully",
            data: {
              OrgId: result.insertId,
              OrgName,
              SubClient,
              MangFName,
              MangLName,
              Mangcontact,
              MangEmail,
            },
          });
        }
      });
    }
  }
);

app.post("/update-incident", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  // Call the stored procedure
  connection.query("CALL UpdateAllIncidents()", (err, result) => {
    if (err) {
      console.error("Error updating incident details:", err);
      res.status(500).send("Internal Server Error");
    } else {
      console.log("Incident details updated successfully");
      res.status(200).send("Incident details updated successfully");
    }
  });
});

app.delete("/deleteclient/:OrgId", verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  const OrgId = req.params.OrgId; // Retrieve siteId from URL parameters

  const sql = "DELETE FROM Organization WHERE OrgId = ?;"; // Use parameterized query

  connection.query(sql, [OrgId], (err, results) => {
    if (err) {
      console.error("Error deleting user from MySQL:", err);
      return res
        .status(500)
        .json({ message: "Error deleting user from the database." });
    }

    if (results.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "User not found or already deleted." });
    }

    // Respond with a success message
    return res.json({ message: "User deleted successfully" });
  });
});

app.get("/total-panel", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  connection.query(
    `
    SELECT
    SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS active,
    SUM(CASE WHEN Status = 0 THEN 1 ELSE 0 END) AS not_active
    FROM
    SiteDetail;
`,
    (error, results) => {
      if (error) {
        console.error("Error retrieving total number of Panel Count:", error);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      const panelCount = results[0].panelCount;
      res.json({ panelCount });
    }
  );
});

// Get client information
app.get("/get-client", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }
  connection.query(
    `SELECT  distinct(OrgName) as client,OrgId FROM Organization;`,
    (error, results) => {
      if (error) {
        console.error("Error retrieving site details:", error);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.json(results);
    }
  );
});

// Get Sub Client information
app.get("/get-subClient", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }
  connection.query(
    `SELECT distinct(SubClient) as SubClient, OrgId FROM Organization;`,
    (error, results) => {
      if (error) {
        console.error("Error retrieving site details:", error);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.json(results);
    }
  );
});

//incident page modal
app.post("/update-incidentmodal/:incidentNo", verifyToken, async (req, res) => {
  try {
    // Extract parameters from request
    const { incidentNo } = req.params;
    const { Remark } = req.body;

    // Fetch user_id from profile API
    const userId = req.user_data.Id;
    console.log(incidentNo, Remark, userId);

    // Update Remark and user_id in IncidentDetail table
    const updateQuery = `
      UPDATE IncidentDetail
      SET Remark = ?,
          user_id = ?, 
          alert_status = 2
      WHERE IncidentNo = ?;
    `;

    connection.query(
      updateQuery,
      [Remark, userId, incidentNo],
      (err, result) => {
        if (err) {
          console.error("Error updating IncidentDetail:", err);
          res.status(500).json({ error: "Error updating IncidentDetail" });
        } else {
          if (result.affectedRows > 0) {
            res.json({
              success: true,
              message: "IncidentDetail updated successfully.",
            });
          } else {
            res.status(404).json({ error: "IncidentDetail not found" });
          }
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get Panel Make information
app.get("/get-panelMake", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }
  connection.query(
    `SELECT PanelMakeId, PanelMakeName FROM serveillance.PanelMake;`,
    (error, results) => {
      if (error) {
        console.error("Error retrieving site details:", error);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.json(results);
    }
  );
});

// Get Panel Type information
app.get("/get-panelType", (req, res) => {
  // const allowedRoles = ["Admin", "super admin", "User"];

  // if (!allowedRoles.includes(req.user_data.role)) {
  //   return res
  //     .status(403)
  //     .json({ error: "Permission denied. Insufficient role." });
  // }
  connection.query(`SELECT * FROM PanelType;`, (error, results) => {
    if (error) {
      console.error("Error retrieving site details:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    res.json(results);
  });
});

app.post("/logout", (req, res) => {
  // Clear the JWT token from the client-side storage
  console.log("clearing token");
  res.clearCookie("token");
  res.setHeader("Authorization", "");

  // Send a JSON response with the redirect URL
  res.status(200).json({
    redirectTo: "./pages-login.html",
  });
});

app.get("/api/latestpanel/data", verifyToken, (req, res) => {
  const allowedRoles = ["Admin", "super admin", "User"];

  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
  }

  // Use the pool to get a connection
  connection.getConnection((err, connection) => {
    if (err) {
      console.error("Error connecting to database: ", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Execute the stored procedure to fetch data from LatestData and SiteDetail tables
    const query = "CALL GetLatestDataWithSiteDetails()";
    connection.query(query, (error, results) => {
      connection.release();

      if (error) {
        console.error("Error executing stored procedure: ", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      // Send the fetched data as JSON response
      res.json({ latest_data: results[0] });
    });
  });
});

function test(data) {
  try {
    var PanelMacId = data.split(",")[5];
    var hh = data.split(",")[7].substring(0, 2);
    var mm = data.split(",")[7].substring(2, 4);
    var ss = data.split(",")[7].substring(4, 6);
    var dd = data.split(",")[8].substring(0, 2);
    var MM = data.split(",")[8].substring(2, 4);
    var yy = data.split(",")[8].substring(4, 6);
    var panelTimeUTC = new Date(
      "20" + yy + "-" + MM + "-" + dd + " " + hh + ":" + mm + ":" + ss
    );
    var formattedDate = moment(panelTimeUTC).format("YYYY-MM-DD HH:mm:ss");
    var macid = data.split(",")[9];
    var z = [];
    for (var j = 0; j < 32; j++) {
      z[j] = data.split(",")[10].split("!")[j];
    }
    let istDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    connection.query(
      `SELECT SiteId, AtmID FROM SiteDetail WHERE PanelMacId = '${macid}'`,
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log(result);
          if (result[0]) {
            // Checking if the data is present in LatestData table
            let SiteId = result[0]["SiteId"];
            let AtmID = result[0]["AtmID"];
            console.log("site", SiteId);
            console.log("atmId", AtmID);
            connection.query(
              `SELECT SiteId FROM LatestData WHERE SiteId = ${SiteId};`,
              (err, result) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log(result);
                  // Updating the existing data
                  if (result[0]) {
                    connection.query(
                      `update LatestData set macid = '${macid}', 
                      AtmID = '${AtmID}',
                      zone1_status = '${z[0]}', zone2_status = '${
                        z[1]
                      }', zone3_status = '${z[2]}', zone4_status = '${
                        z[3]
                      }', zone5_status = '${z[4]}', zone6_status = '${
                        z[5]
                      }', zone7_status = '${z[6]}', zone8_status = '${
                        z[7]
                      }', zone9_status = '${z[8]}', zone10_status = '${
                        z[9]
                      }', zone11_status = '${z[10]}', zone12_status = '${
                        z[11]
                      }', zone13_status = '${z[12]}', zone14_status = '${
                        z[13]
                      }', zone15_status = '${z[14]}', zone16_status = '${
                        z[15]
                      }', zone17_status = '${z[16]}', zone18_status = '${
                        z[17]
                      }', zone19_status = '${z[18]}', zone20_status = '${
                        z[19]
                      }', zone21_status = '${z[20]}', zone22_status = '${
                        z[21]
                      }', zone23_status = '${z[22]}', zone24_status = '${
                        z[23]
                      }', zone25_status = '${z[24]}', zone26_status = '${
                        z[25]
                      }', zone27_status = '${z[26]}', zone28_status = '${
                        z[27]
                      }', zone29_status = '${z[28]}', zone30_status = '${
                        z[29]
                      }', zone31_status = '${z[30]}', zone32_status = '${
                        z[31]
                      }', panel_evt_dt = '${formattedDate}', ist_evt_dt = '${moment(
                        istDate
                      ).format(
                        "YYYY-MM-DD HH:mm:ss"
                      )}' where SiteId = '${SiteId}'`,
                      (err, result) => {
                        if (err) {
                          console.log(err);
                        } else {
                          console.log(result);
                        }
                      }
                    );
                    connection.query(
                      `SELECT trans.zone1_Astatus, trans.zone2_Astatus, trans.zone3_Astatus, trans.zone4_Astatus, trans.zone5_Astatus,
                      trans.zone6_Astatus, trans.zone7_Astatus, trans.zone8_Astatus, trans.zone9_Astatus, trans.zone10_Astatus,
                      trans.zone11_Astatus, trans.zone12_Astatus, trans.zone13_Astatus, trans.zone14_Astatus, trans.zone15_Astatus,
                        trans.zone16_Astatus, trans.zone17_Astatus, trans.zone18_Astatus, trans.zone19_Astatus, trans.zone20_Astatus, 
                        trans.zone21_Astatus, trans.zone22_Astatus, trans.zone23_Astatus, trans.zone24_Astatus, trans.zone25_Astatus, 
                        trans.zone26_Astatus, trans.zone27_Astatus, trans.zone28_Astatus, trans.zone29_Astatus, trans.zone30_Astatus,trans.zone31_Astatus,
                        trans.zone32_Astatus FROM SiteDetail AS mst JOIN LatestData AS trans ON mst.SiteId = trans.SiteId WHERE mst.SiteId = '${SiteId}'`,
                      (err, zoneresult) => {
                        if (err) {
                          console.log(err);
                        } else {
                          if (zoneresult[0]) {
                            for (var i = 0; i < 32; i++) {
                              var zoneNum = i + 1;
                              var zoneE = zoneresult[0][`zone${zoneNum}_e`];
                              var zoneAStatusTimeValue =
                                zoneresult[0][`zone${zoneNum}_Astatus`];
                              if (zoneAStatusTimeValue) {
                                var zoneAStatusTime =
                                  zoneresult[0][`zone${zoneNum}_Astatus`].split(
                                    ","
                                  );
                                var zoneAStatus = zoneAStatusTime[0];
                              } else {
                                var zoneAStatus = null;
                              }
                              if (zoneE == 1) {
                                if (
                                  (zoneAStatus == null || zoneAStatus == 3) &&
                                  z[i] ==
                                    (zoneNum > 9
                                      ? `${zoneNum}RA`
                                      : `0${zoneNum}RA`)
                                ) {
                                  connection.query(
                                    `update LatestData set zone${zoneNum}_Astatus = "1,${formattedDate},${moment(
                                      istDate
                                    ).format(
                                      "YYYY-MM-DD HH:mm:ss"
                                    )}" where SiteId = '${SiteId}'`,
                                    (err, updateResult) => {
                                      if (err) {
                                        console.log(err);
                                      }
                                    }
                                  );
                                } else if (
                                  (zoneAStatus == 1 || zoneAStatus == null) &&
                                  z[i] ==
                                    (zoneNum > 9
                                      ? `${zoneNum}AA`
                                      : `0${zoneNum}AA`)
                                ) {
                                  connection.query(
                                    `update LatestData set zone${zoneNum}_Astatus = "2,${formattedDate},${moment(
                                      istDate
                                    ).format(
                                      "YYYY-MM-DD HH:mm:ss"
                                    )}" where SiteId = '${SiteId}'`,
                                    (err, updateResult) => {
                                      if (err) {
                                        console.log(err);
                                      }
                                    }
                                  );
                                }
                              }
                            }
                          }
                        }
                      }
                    );
                  }
                  // Adding data in the database
                  else {
                    connection.query(
                      `INSERT INTO LatestData (macid, SiteId, AtmID, zone1_status, zone2_status, zone3_status, zone4_status, zone5_status, zone6_status, zone7_status, zone8_status, zone9_status, zone10_status, zone11_status, zone12_status, zone13_status, zone14_status, zone15_status, zone16_status, zone17_status, zone18_status, zone19_status, zone20_status, zone21_status, zone22_status, zone23_status, zone24_status, zone25_status, zone26_status, zone27_status, zone28_status, zone29_status, zone30_status, zone31_status, zone32_status, panel_evt_dt, ist_evt_dt) 
                      VALUES ('${macid}', '${SiteId}', '${AtmID}', '${
                        z[0]
                      }', '${z[1]}', '${z[2]}', '${z[3]}', '${z[4]}','${
                        z[5]
                      }','${z[6]}','${z[7]}','${z[8]}','${z[9]}','${z[10]}','${
                        z[11]
                      }','${z[12]}','${z[13]}','${z[14]}','${z[15]}','${
                        z[16]
                      }','${z[17]}', '${z[18]}','${z[19]}','${z[20]}','${
                        z[21]
                      }','${z[22]}','${z[23]}','${z[24]}','${z[25]}','${
                        z[26]
                      }','${z[27]}','${z[28]}','${z[29]}','${z[30]}','${
                        z[31]
                      }', '${formattedDate}', '${moment(istDate).format(
                        "YYYY-MM-DD HH:mm:ss"
                      )}')`,
                      (err, result) => {
                        if (err) {
                          console.log(err);
                        } else {
                          console.log(result);
                        }
                      }
                    );

                    connection.query(
                      `SELECT trans.zone1_Astatus, trans.zone2_Astatus, trans.zone3_Astatus, trans.zone4_Astatus, trans.zone5_Astatus,
                      trans.zone6_Astatus, trans.zone7_Astatus, trans.zone8_Astatus, trans.zone9_Astatus, trans.zone10_Astatus,
                      trans.zone11_Astatus, trans.zone12_Astatus, trans.zone13_Astatus, trans.zone14_Astatus, trans.zone15_Astatus,
                      trans.zone16_Astatus, trans.zone17_Astatus, trans.zone18_Astatus, trans.zone19_Astatus, trans.zone20_Astatus, 
                      trans.zone21_Astatus, trans.zone22_Astatus, trans.zone23_Astatus, trans.zone24_Astatus, trans.zone25_Astatus, 
                      trans.zone26_Astatus, trans.zone27_Astatus, trans.zone28_Astatus, trans.zone29_Astatus, trans.zone30_Astatus,trans.zone31_Astatus,
                      trans.zone32_Astatus FROM SiteDetail AS mst JOIN LatestData AS trans ON mst.SiteId = trans.SiteId WHERE mst.SiteId = '${SiteId}'`,
                      (err, zoneresult) => {
                        if (err) {
                          console.log(err);
                        } else {
                          if (zoneresult[0]) {
                            for (var i = 0; i < 32; i++) {
                              var zoneNum = i + 1;
                              var zoneE = zoneresult[0][`zone${zoneNum}_e`];
                              var zoneAStatusTimeValue =
                                zoneresult[0][`zone${zoneNum}_Astatus`];
                              if (zoneAStatusTimeValue) {
                                var zoneAStatusTime =
                                  zoneresult[0][`zone${zoneNum}_Astatus`].split(
                                    ","
                                  );
                                var zoneAStatus = zoneAStatusTime[0];
                              } else {
                                var zoneAStatus = null;
                              }
                              if (zoneE == 1) {
                                if (
                                  (zoneAStatus == null || zoneAStatus == 3) &&
                                  z[i] ==
                                    (zoneNum > 9
                                      ? `${zoneNum}RA`
                                      : `0${zoneNum}RA`)
                                ) {
                                  connection.query(
                                    `update LatestData set zone${zoneNum}_Astatus = "1,${formattedDate},${moment(
                                      istDate
                                    ).format(
                                      "YYYY-MM-DD HH:mm:ss"
                                    )}" where SiteId = '${SiteId}'`,
                                    (err, updateResult) => {
                                      if (err) {
                                        console.log(err);
                                      }
                                    }
                                  );
                                } else if (
                                  (zoneAStatus == 1 || zoneAStatus == null) &&
                                  z[i] ==
                                    (zoneNum > 9
                                      ? `${zoneNum}AA`
                                      : `0${zoneNum}AA`)
                                ) {
                                  connection.query(
                                    `update LatestData set zone${zoneNum}_Astatus = "2,${formattedDate},${moment(
                                      istDate
                                    ).format(
                                      "YYYY-MM-DD HH:mm:ss"
                                    )}" where SiteId = '${SiteId}'`,
                                    (err, updateResult) => {
                                      if (err) {
                                        console.log(err);
                                      }
                                    }
                                  );
                                }
                              }
                            }
                          }
                        }
                      }
                    );
                  }
                }
              }
            );
          }
        }
      }
    );
  } catch (err) {
    console.log(err);
  }
}

function alerts(data) {
  try {
    var values = data.split(",");
    var macid = data.split(",")[7];
    var hh = values[19].substring(0, 2);
    var mm = values[19].substring(2, 4);
    var ss = values[19].substring(4, 6);
    var dd = values[20].substring(0, 2);
    var MM = values[20].substring(2, 4);
    var yy = values[20].substring(4, 6);
    var panelTimeUTC = new Date(
      "20" + yy + "-" + MM + "-" + dd + " " + hh + ":" + mm + ":" + ss
    );
    let istDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    var eventCode = values[26].slice(0, 3);
    console.log(eventCode);
    try {
      const queryEventCode = `SELECT event_code, description, alerts_status, alert_check FROM event_codes WHERE event_code LIKE '${eventCode}%'`;
      connection.query(queryEventCode, (error, result) => {
        if (error) {
          console.log(error);
        } else {
          console.log(result);
          if (
            result.length == 1 &&
            result[0]["alerts_status"] == 1 &&
            result[0]["alert_check"] == 1
          ) {
            var description = result[0].description;
            connection.query(
              `SELECT SiteId, AtmID, BranchName, Client, SubClient, zone${parseInt(
                values[26].slice(-2)
              )}_name, zone${parseInt(
                values[26].slice(-2)
              )}_alert_enable FROM SiteDetail WHERE PanelMacId = '${macid}'`,
              (siteDetailsError, siteDetailsResult) => {
                if (siteDetailsError) {
                  console.log(siteDetailsError);
                  console.log(express.query);
                }
                if (siteDetailsResult[0]) {
                  if (
                    parseInt(
                      siteDetailsResult[0][
                        `zone${parseInt(values[26].slice(-2))}_alert_enable`
                      ].split(",")[0]
                    ) == 1
                  ) {
                    var IncidentName =
                      siteDetailsResult[0][
                        `zone${parseInt(values[26].slice(-2))}_name`
                      ] +
                      " " +
                      description;
                    connection.query(
                      `insert into IncidentDetail ( SiteId, AtmID, SiteName, Client, SubClient, IncidentName, IstTimeStamp, PanelTimeStamp, AlertType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [
                        siteDetailsResult[0].SiteId,
                        siteDetailsResult[0].AtmID,
                        siteDetailsResult[0].BranchName,
                        siteDetailsResult[0].Client,
                        siteDetailsResult[0].SubClient,
                        IncidentName,
                        moment(istDate).format("YYYY-MM-DD HH:mm:ss"),
                        moment(panelTimeUTC).format("YYYY-MM-DD HH:mm:ss"),
                        parseInt(
                          siteDetailsResult[0][
                            `zone${parseInt(values[26].slice(-2))}_alert_enable`
                          ].split(",")[1]
                        ),
                      ],
                      (IncidentDetailError, IncidentDetailResult) => {
                        if (IncidentDetailError) {
                          console.log(IncidentDetailError);
                        } else {
                          console.log(IncidentDetailResult);
                        }
                      }
                    );
                  }
                }
              }
            );
          } else if (
            result.length == 1 &&
            result[0]["alerts_status"] == 1 &&
            result[0]["alert_check"] == 0
          ) {
            var description = result[0].description;
            connection.query(
              `SELECT SiteId, AtmID, BranchName, Client, SubClient FROM SiteDetail WHERE PanelMacId = '${macid}'`,
              (siteDetailsError, siteDetailsResult) => {
                if (siteDetailsError) {
                  console.log(siteDetailsError);
                }
                if (siteDetailsResult[0]) {
                  var IncidentName = description;
                  connection.query(
                    `insert into IncidentDetail (SiteId, AtmID, SiteName, Client, SubClient, IncidentName, IstTimeStamp, PanelTimeStamp, AlertType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      siteDetailsResult[0].SiteId,
                      siteDetailsResult[0].AtmID,
                      siteDetailsResult[0].BranchName,
                      siteDetailsResult[0].Client,
                      siteDetailsResult[0].SubClient,
                      IncidentName,
                      moment(istDate).format("YYYY-MM-DD HH:mm:ss"),
                      moment(panelTimeUTC).format("YYYY-MM-DD HH:mm:ss"),
                      3,
                    ],
                    (IncidentDetailError, IncidentDetailResult) => {
                      if (IncidentDetailError) {
                        console.log(IncidentDetailError);
                      } else {
                        console.log(IncidentDetailResult);
                      }
                    }
                  );
                }
              }
            );
          } else if (result.length > 1) {
            for (i = 0; i < result.length; i++) {
              if (
                result[i].event_code == values[26] &&
                result[i].alerts_status == 1 &&
                result[i].alert_check == 0
              ) {
                var description = result[i].description;
                connection.query(
                  `SELECT SiteId, AtmID, BranchName, Client, SubClient FROM SiteDetail WHERE PanelMacId = '${macid}'`,
                  (siteDetailsError, siteDetailsResult) => {
                    if (siteDetailsError) {
                      console.log(siteDetailsError);
                    }
                    if (siteDetailsResult[0]) {
                      var IncidentName = description;
                      connection.query(
                        `insert into IncidentDetail (SiteId, AtmID, SiteName, Client, SubClient, IncidentName, IstTimeStamp, PanelTimeStamp, AlertType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                          siteDetailsResult[0].SiteId,
                          siteDetailsResult[0].AtmID,
                          siteDetailsResult[0].BranchName,
                          siteDetailsResult[0].Client,
                          siteDetailsResult[0].SubClient,
                          IncidentName,
                          moment(istDate).format("YYYY-MM-DD HH:mm:ss"),
                          moment(panelTimeUTC).format("YYYY-MM-DD HH:mm:ss"),
                          3,
                        ],
                        (IncidentDetailError, IncidentDetailResult) => {
                          if (IncidentDetailError) {
                            console.log(IncidentDetailError);
                          }
                        }
                      );
                    }
                  }
                );
              }
            }
          }
        }
      });
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
}

const server = net.createServer((socket) => {
  console.log("Client connected");
  socket.write(`$1lv,4,\n`);
  socket.on("data", (data) => {
    var str = data.toString();
    var cstr = str.split(",");
    console.log(`Received data from client ${data}`);
    if (cstr[0] == "#1I") {
      try {
        alerts(str);
        socket.write(`$1lv,4,\n`);
        socket.write(`$1lB,16,1,cstr[23],\n`);
      } catch (error) {
        console.log(error);
      }
    } else if (cstr[0] == "#1v") {
      test(str);
    } else {
      try {
        socket.write(`$1lv,4,\n`);
      } catch (error) {
        console.log(error);
      }
    }
  });
  socket.on("end", () => {
    console.log("Client disconnected");
  });
});

app.listen(3328, () => {
  console.log("Server is running on port 3328");
});
server.listen(5501, () => {
  console.log("Server started on port 5501");
});
