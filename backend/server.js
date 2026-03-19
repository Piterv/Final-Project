
const express = require("express");
const path = require("path");

// Importing db
require("./db");

// task routes
const taskRoutes = require("./routes/tasks");

const app = express();
const PORT = process.env.PORT || 3000; // PORT 3000

// Parse  JSON 
app.use(express.json({ limit: "100kb" }));

// Serve as static files
app.use(express.static(path.join(__dirname, "../frontend")));

// all requests to /api/tasks are handled in routes/tasks.js
app.use("/api/tasks", taskRoutes);

// 404 
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(500).json({ error: "Something went wrong on the server." });
});

// listening HTTP requests
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
