const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "accredian_referrals",
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database:", err);
    return;
  }
  console.log("Connected to MySQL database");

  // Create tables if they don't exist
  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS referrals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      referrer_name VARCHAR(100) NOT NULL,
      referrer_email VARCHAR(100) NOT NULL,
      referrer_phone VARCHAR(20) NOT NULL,
      referee_name VARCHAR(100) NOT NULL,
      referee_email VARCHAR(100) NOT NULL,
      referee_phone VARCHAR(20) NOT NULL,
      course VARCHAR(100) NOT NULL,
      status ENUM('pending', 'contacted', 'enrolled', 'completed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

  db.query(createTablesQuery, (err) => {
    if (err) {
      console.error("Error creating tables:", err);
    } else {
      console.log("Tables created or already exist");
    }
  });
});

// API Routes

// Get all referrals
app.get("/api/referrals", (req, res) => {
  const query = "SELECT * FROM referrals ORDER BY created_at DESC";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching referrals:", err);
      return res.status(500).json({ error: "Failed to fetch referrals" });
    }

    res.status(200).json(results);
  });
});

// Get referrals by referrer email
app.get("/api/referrals/referrer/:email", (req, res) => {
  const { email } = req.params;
  const query =
    "SELECT * FROM referrals WHERE referrer_email = ? ORDER BY created_at DESC";

  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Error fetching referrals by email:", err);
      return res.status(500).json({ error: "Failed to fetch referrals" });
    }

    res.status(200).json(results);
  });
});

// Create a new referral
app.post("/api/referrals", (req, res) => {
  const {
    referrerName,
    referrerEmail,
    referrerPhone,
    refereeName,
    refereeEmail,
    refereePhone,
    course,
  } = req.body;

  // Validate required fields
  if (
    !referrerName ||
    !referrerEmail ||
    !referrerPhone ||
    !refereeName ||
    !refereeEmail ||
    !refereePhone ||
    !course
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Validate email format
  const emailRegex = /\S+@\S+\.\S+/;
  if (!emailRegex.test(referrerEmail) || !emailRegex.test(refereeEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Validate phone number (10 digits)
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(referrerPhone) || !phoneRegex.test(refereePhone)) {
    return res.status(400).json({ error: "Phone number must be 10 digits" });
  }

  const query = `
    INSERT INTO referrals 
    (referrer_name, referrer_email, referrer_phone, referee_name, referee_email, referee_phone, course)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      referrerName,
      referrerEmail,
      referrerPhone,
      refereeName,
      refereeEmail,
      refereePhone,
      course,
    ],
    (err, result) => {
      if (err) {
        console.error("Error creating referral:", err);
        return res.status(500).json({ error: "Failed to create referral" });
      }

      res.status(201).json({
        id: result.insertId,
        message: "Referral created successfully",
      });
    }
  );
});

// Update referral status
app.patch("/api/referrals/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (
    !status ||
    !["pending", "contacted", "enrolled", "completed"].includes(status)
  ) {
    return res.status(400).json({ error: "Valid status is required" });
  }

  const query = "UPDATE referrals SET status = ? WHERE id = ?";

  db.query(query, [status, id], (err, result) => {
    if (err) {
      console.error("Error updating referral status:", err);
      return res
        .status(500)
        .json({ error: "Failed to update referral status" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Referral not found" });
    }

    res.status(200).json({ message: "Referral status updated successfully" });
  });
});

// Get referral statistics
app.get("/api/statistics", (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_referrals,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_referrals,
      SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_referrals,
      SUM(CASE WHEN status = 'enrolled' THEN 1 ELSE 0 END) as enrolled_referrals,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_referrals
    FROM referrals
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching statistics:", err);
      return res.status(500).json({ error: "Failed to fetch statistics" });
    }

    res.status(200).json(results[0]);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
