const { app, verifyToken, connection } = require("./app");

// Assuming you have a database connection named 'connection'
app.post("/addsite", verifyToken, (req, res) => {
  // Check if the user has the required roles to perform this action
  const allowedRoles = ["Admin", "super admin", "User"];
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

  // ,
  // zone1_name,
  // zone2_name,
  // zone3_name,
  // zone4_name,
  // zone5_name,
  // zone6_name,
  // zone7_name,
  // zone8_name,
  // zone9_name,
  // zone10_name,
  // zone11_name,
  // zone12_name,
  // zone13_name,
  // zone14_name,
  // zone15_name,
  // zone16_name,
  // zone17_name,
  // zone18_name,
  // zone19_name,
  // zone20_name,
  // zone21_name,
  // zone22_name,
  // zone23_name,
  // zone24_name,
  // zone25_name,
  // zone26_name,
  // zone27_name,
  // zone28_name,
  // zone29_name,
  // zone30_name,
  // zone31_name,
  // zone32_name,
  if (!allowedRoles.includes(req.user_data.role)) {
    return res
      .status(403)
      .json({ error: "Permission denied. Insufficient role." });
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
        SiteId,
        DVR,
        SiteAddress,
        QrtNo,
      ];

      connection.query(updateSQL, updateValues, (updateErr, updateResults) => {
        if (updateErr) {
          console.error("Error updating data in MySQL:", updateErr);
          return res
            .status(500)
            .json({ error: "Error updating data in the database." });
        }
        const panelTypeSQL = "SELECT * FROM PanelType WHERE PanelTypeName = ?";
        connection.query(
          panelTypeSQL,
          [PanelType],
          (panelTypeErr, panelTypeResults) => {
            if (panelTypeErr) {
              console.error(
                "Error retrieving PanelType from MySQL:",
                panelTypeErr
              );
              // Handle error if necessary
            }
            console.log(panelTypeResults);
            if (panelTypeResults.length > 0) {
              // Update zone1_name and zone2_name in SiteDetail table
              const updateZoneSQL = `UPDATE SiteDetail SET
              zone1_name = ?,
              zone2_name = ?,
              zone3_name = ?,
              zone4_name = ?,
              zone5_name = ?,
              zone6_name = ?,
              zone7_name = ?,
              zone8_name = ?,
              zone9_name = ?,
              zone10_name = ?,
              zone11_name = ?,
              zone12_name = ?,
              zone13_name = ?,
              zone14_name = ?,
              zone15_name = ?,
              zone16_name = ?,
              zone17_name = ?,
              zone18_name = ?,
              zone19_name = ?,
              zone20_name = ?,
              zone21_name = ?,
              zone22_name = ?,
              zone23_name = ?,
              zone24_name = ?,
              zone25_name = ?,
              zone26_name = ?,
              zone27_name = ?,
              zone28_name = ?,
              zone29_name = ?,
              zone30_name = ?,
              zone31_name = ?,
              zone32_name = ?,
              zone1_alert_enable = ?,
              zone2_alert_enable = ?,
              zone3_alert_enable = ?,
              zone4_alert_enable = ?,
              zone5_alert_enable = ?,
              zone6_alert_enable = ?,
              zone7_alert_enable = ?,
              zone8_alert_enable = ?,
              zone9_alert_enable = ?,
              zone10_alert_enable = ?,
              zone11_alert_enable = ?,
              zone12_alert_enable = ?,
              zone13_alert_enable = ?,
              zone14_alert_enable = ?,
              zone15_alert_enable = ?,
              zone16_alert_enable = ?,
              zone17_alert_enable = ?,
              zone18_alert_enable = ?,
              zone19_alert_enable = ?,
              zone20_alert_enable = ?,
              zone21_alert_enable = ?,
              zone22_alert_enable = ?,
              zone23_alert_enable = ?,
              zone24_alert_enable = ?,
              zone25_alert_enable = ?,
              zone26_alert_enable = ?,
              zone27_alert_enable = ?,
              zone28_alert_enable = ?,
              zone29_alert_enable = ?,
              zone30_alert_enable = ?,
              zone31_alert_enable = ?,
              zone32_alert_enable = ?
          WHERE SiteId = ?`;

              const updateZoneValues = [
                panelTypeResults[0].zone1_name,
                panelTypeResults[0].zone2_name,
                panelTypeResults[0].zone3_name,
                panelTypeResults[0].zone4_name,
                panelTypeResults[0].zone5_name,
                panelTypeResults[0].zone6_name,
                panelTypeResults[0].zone7_name,
                panelTypeResults[0].zone8_name,
                panelTypeResults[0].zone9_name,
                panelTypeResults[0].zone10_name,
                panelTypeResults[0].zone11_name,
                panelTypeResults[0].zone12_name,
                panelTypeResults[0].zone13_name,
                panelTypeResults[0].zone14_name,
                panelTypeResults[0].zone15_name,
                panelTypeResults[0].zone16_name,
                panelTypeResults[0].zone17_name,
                panelTypeResults[0].zone18_name,
                panelTypeResults[0].zone19_name,
                panelTypeResults[0].zone20_name,
                panelTypeResults[0].zone21_name,
                panelTypeResults[0].zone22_name,
                panelTypeResults[0].zone23_name,
                panelTypeResults[0].zone24_name,
                panelTypeResults[0].zone25_name,
                panelTypeResults[0].zone26_name,
                panelTypeResults[0].zone27_name,
                panelTypeResults[0].zone28_name,
                panelTypeResults[0].zone29_name,
                panelTypeResults[0].zone30_name,
                panelTypeResults[0].zone31_name,
                panelTypeResults[0].zone32_name,
                panelTypeResults[0].zone1_alert_enable,
                panelTypeResults[0].zone2_alert_enable,
                panelTypeResults[0].zone3_alert_enable,
                panelTypeResults[0].zone4_alert_enable,
                panelTypeResults[0].zone5_alert_enable,
                panelTypeResults[0].zone6_alert_enable,
                panelTypeResults[0].zone7_alert_enable,
                panelTypeResults[0].zone8_alert_enable,
                panelTypeResults[0].zone9_alert_enable,
                panelTypeResults[0].zone10_alert_enable,
                panelTypeResults[0].zone11_alert_enable,
                panelTypeResults[0].zone12_alert_enable,
                panelTypeResults[0].zone13_alert_enable,
                panelTypeResults[0].zone14_alert_enable,
                panelTypeResults[0].zone15_alert_enable,
                panelTypeResults[0].zone16_alert_enable,
                panelTypeResults[0].zone17_alert_enable,
                panelTypeResults[0].zone18_alert_enable,
                panelTypeResults[0].zone19_alert_enable,
                panelTypeResults[0].zone20_alert_enable,
                panelTypeResults[0].zone21_alert_enable,
                panelTypeResults[0].zone22_alert_enable,
                panelTypeResults[0].zone23_alert_enable,
                panelTypeResults[0].zone24_alert_enable,
                panelTypeResults[0].zone25_alert_enable,
                panelTypeResults[0].zone26_alert_enable,
                panelTypeResults[0].zone27_alert_enable,
                panelTypeResults[0].zone28_alert_enable,
                panelTypeResults[0].zone29_alert_enable,
                panelTypeResults[0].zone30_alert_enable,
                panelTypeResults[0].zone31_alert_enable,
                panelTypeResults[0].zone32_alert_enable,
                SiteId,
              ];

              connection.query(
                updateZoneSQL,
                updateZoneValues,
                (updateZoneErr, updateZoneResults) => {
                  if (updateZoneErr) {
                    console.error(
                      "Error updating zone names in MySQL:",
                      updateZoneErr
                    );
                    // Handle error if necessary
                  }
                }
              );
            }
          }
        );
        return res.json({ message: "Item updated successfully" });
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
        Region,
      ];

      connection.query(insertSQL, insertValues, (insertErr, insertResults) => {
        if (insertErr) {
          console.error("Error inserting data into MySQL:", insertErr);
          return res
            .status(500)
            .json({ error: "Error inserting data into the database." });
        }
        const insertedSiteId = insertResults.insertId;
        console.log(insertedSiteId);

        // Logic to update zone1_name and zone2_name from PanelType table if PanelType matches
        const panelTypeSQL = "SELECT * FROM PanelType WHERE PanelTypeName = ?";
        connection.query(
          panelTypeSQL,
          [PanelType],
          (panelTypeErr, panelTypeResults) => {
            if (panelTypeErr) {
              console.error(
                "Error retrieving PanelType from MySQL:",
                panelTypeErr
              );
              // Handle error if necessary
            }
            console.log(panelTypeResults);
            if (panelTypeResults.length > 0) {
              // Update zone1_name and zone2_name in SiteDetail table
              const updateZoneSQL = `UPDATE SiteDetail SET
            zone1_name = ?,
            zone2_name = ?,
            zone3_name = ?,
            zone4_name = ?,
            zone5_name = ?,
            zone6_name = ?,
            zone7_name = ?,
            zone8_name = ?,
            zone9_name = ?,
            zone10_name = ?,
            zone11_name = ?,
            zone12_name = ?,
            zone13_name = ?,
            zone14_name = ?,
            zone15_name = ?,
            zone16_name = ?,
            zone17_name = ?,
            zone18_name = ?,
            zone19_name = ?,
            zone20_name = ?,
            zone21_name = ?,
            zone22_name = ?,
            zone23_name = ?,
            zone24_name = ?,
            zone25_name = ?,
            zone26_name = ?,
            zone27_name = ?,
            zone28_name = ?,
            zone29_name = ?,
            zone30_name = ?,
            zone31_name = ?,
            zone32_name = ?,
            zone1_alert_enable = ?,
            zone2_alert_enable = ?,
            zone3_alert_enable = ?,
            zone4_alert_enable = ?,
            zone5_alert_enable = ?,
            zone6_alert_enable = ?,
            zone7_alert_enable = ?,
            zone8_alert_enable = ?,
            zone9_alert_enable = ?,
            zone10_alert_enable = ?,
            zone11_alert_enable = ?,
            zone12_alert_enable = ?,
            zone13_alert_enable = ?,
            zone14_alert_enable = ?,
            zone15_alert_enable = ?,
            zone16_alert_enable = ?,
            zone17_alert_enable = ?,
            zone18_alert_enable = ?,
            zone19_alert_enable = ?,
            zone20_alert_enable = ?,
            zone21_alert_enable = ?,
            zone22_alert_enable = ?,
            zone23_alert_enable = ?,
            zone24_alert_enable = ?,
            zone25_alert_enable = ?,
            zone26_alert_enable = ?,
            zone27_alert_enable = ?,
            zone28_alert_enable = ?,
            zone29_alert_enable = ?,
            zone30_alert_enable = ?,
            zone31_alert_enable = ?,
            zone32_alert_enable = ?
        WHERE SiteId = ?`;

              const updateZoneValues = [
                panelTypeResults[0].zone1_name,
                panelTypeResults[0].zone2_name,
                panelTypeResults[0].zone3_name,
                panelTypeResults[0].zone4_name,
                panelTypeResults[0].zone5_name,
                panelTypeResults[0].zone6_name,
                panelTypeResults[0].zone7_name,
                panelTypeResults[0].zone8_name,
                panelTypeResults[0].zone9_name,
                panelTypeResults[0].zone10_name,
                panelTypeResults[0].zone11_name,
                panelTypeResults[0].zone12_name,
                panelTypeResults[0].zone13_name,
                panelTypeResults[0].zone14_name,
                panelTypeResults[0].zone15_name,
                panelTypeResults[0].zone16_name,
                panelTypeResults[0].zone17_name,
                panelTypeResults[0].zone18_name,
                panelTypeResults[0].zone19_name,
                panelTypeResults[0].zone20_name,
                panelTypeResults[0].zone21_name,
                panelTypeResults[0].zone22_name,
                panelTypeResults[0].zone23_name,
                panelTypeResults[0].zone24_name,
                panelTypeResults[0].zone25_name,
                panelTypeResults[0].zone26_name,
                panelTypeResults[0].zone27_name,
                panelTypeResults[0].zone28_name,
                panelTypeResults[0].zone29_name,
                panelTypeResults[0].zone30_name,
                panelTypeResults[0].zone31_name,
                panelTypeResults[0].zone32_name,
                panelTypeResults[0].zone1_alert_enable,
                panelTypeResults[0].zone2_alert_enable,
                panelTypeResults[0].zone3_alert_enable,
                panelTypeResults[0].zone4_alert_enable,
                panelTypeResults[0].zone5_alert_enable,
                panelTypeResults[0].zone6_alert_enable,
                panelTypeResults[0].zone7_alert_enable,
                panelTypeResults[0].zone8_alert_enable,
                panelTypeResults[0].zone9_alert_enable,
                panelTypeResults[0].zone10_alert_enable,
                panelTypeResults[0].zone11_alert_enable,
                panelTypeResults[0].zone12_alert_enable,
                panelTypeResults[0].zone13_alert_enable,
                panelTypeResults[0].zone14_alert_enable,
                panelTypeResults[0].zone15_alert_enable,
                panelTypeResults[0].zone16_alert_enable,
                panelTypeResults[0].zone17_alert_enable,
                panelTypeResults[0].zone18_alert_enable,
                panelTypeResults[0].zone19_alert_enable,
                panelTypeResults[0].zone20_alert_enable,
                panelTypeResults[0].zone21_alert_enable,
                panelTypeResults[0].zone22_alert_enable,
                panelTypeResults[0].zone23_alert_enable,
                panelTypeResults[0].zone24_alert_enable,
                panelTypeResults[0].zone25_alert_enable,
                panelTypeResults[0].zone26_alert_enable,
                panelTypeResults[0].zone27_alert_enable,
                panelTypeResults[0].zone28_alert_enable,
                panelTypeResults[0].zone29_alert_enable,
                panelTypeResults[0].zone30_alert_enable,
                panelTypeResults[0].zone31_alert_enable,
                panelTypeResults[0].zone32_alert_enable,
                insertedSiteId,
              ];
              console.log(updateZoneValues);

              connection.query(
                updateZoneSQL,
                updateZoneValues,
                (updateZoneErr, updateZoneResults) => {
                  if (updateZoneErr) {
                    console.error(
                      "Error updating zone names in MySQL:",
                      updateZoneErr
                    );
                    // Handle error if necessary
                  }
                }
              );
            }
          }
        );

        return res.json({ message: "Item added successfully" });
      });
    }
  });
});
