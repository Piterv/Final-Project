
const express = require("express");
const db      = require("../db");
const { validateTask }  = require("../utils/validate");
const { sanitizeInput } = require("../utils/sanitize");

const router = express.Router(); 

// current date/time

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

// sanitizes every field

function cleanTaskInput(body) {
  return {
    title:       sanitizeInput(body.title),
    description: sanitizeInput(body.description),
    status:      sanitizeInput(body.status),
    deleted:     Number(body.deleted) === 1 ? 1 : 0 // only allow 0 or 1
  };
}

// GET /api/tasks

router.get("/", (req, res) => {
  db.all("SELECT * FROM tasks ORDER BY id ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database read failed." });
    res.json(rows); // send back the array of tasks as JSON
  });
});

// GET /api/tasks/:id 

router.get("/:id", (req, res) => {
  db.get("SELECT * FROM tasks WHERE id = ?", [req.params.id], (err, row) => {
    if (err)  return res.status(500).json({ error: "Database read failed." });
    if (!row) return res.status(404).json({ error: "Task not found." });
    res.json(row);
  });
});

// POST /api/tasks

router.post("/", (req, res) => {
  const task   = cleanTaskInput(req.body);
  const errors = validateTask(task);


  if (errors.length) return res.status(400).json({ errors });

  const created = now(); 

  db.run(
    "INSERT INTO tasks (title, description, status, deleted, created_at) VALUES (?, ?, ?, 0, ?)",
    [task.title, task.description, task.status, created],
    function(err) {
      if (err) return res.status(500).json({ error: "Database insert failed." });


      res.status(201).json({
        id: this.lastID,
        title: task.title,
        description: task.description,
        status: task.status,
        deleted: 0,
        created_at: created,
        completed_at: null,
        deleted_at: null
      });
    }
  );
});

//PUT /api/tasks/:id

router.put("/:id", (req, res) => {
  const task   = cleanTaskInput(req.body);
  const errors = validateTask(task);
  if (errors.length) return res.status(400).json({ errors });

  // fetch the existing row

  db.get("SELECT * FROM tasks WHERE id = ?", [req.params.id], (err, existing) => {
    if (err)       return res.status(500).json({ error: "Database read failed." });
    if (!existing) return res.status(404).json({ error: "Task not found." });

    const completed_at =
      task.status === "Completed" && existing.status !== "Completed"
        ? now()                         
        : task.status !== "Completed"
          ? null                        
          : existing.completed_at;  


    const deleted_at =
      task.deleted === 1 && existing.deleted !== 1
        ? now()            
        : task.deleted !== 1
          ? null           
          : existing.deleted_at; 

    db.run(
      `UPDATE tasks
       SET title=?, description=?, status=?, deleted=?, completed_at=?, deleted_at=?
       WHERE id=?`,
      [task.title, task.description, task.status, task.deleted,
       completed_at, deleted_at, req.params.id],
      function(err) {
        if (err)           return res.status(500).json({ error: "Database update failed." });
        if (!this.changes) return res.status(404).json({ error: "Task not found." });

        // return updated task

        res.json({
          id: Number(req.params.id),
          ...task,
          created_at: existing.created_at, 
          completed_at,
          deleted_at
        });
      }
    );
  });
});

// DELETE /api/tasks/:id 

router.delete("/:id", (req, res) => {
  const deletedAt = now();

  db.run(
    "UPDATE tasks SET deleted=1, deleted_at=? WHERE id=?",
    [deletedAt, req.params.id],
    function(err) {
      if (err)           return res.status(500).json({ error: "Delete failed." });
      if (!this.changes) return res.status(404).json({ error: "Task not found." });
      res.json({ message: "Task moved to Deleted Tasks." });
    }
  );
});

// export the router

module.exports = router;
