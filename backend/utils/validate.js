
function containsSqlInjectionPattern(value) {
  if (typeof value !== "string") return false;

  const patterns = [
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i, // e.g. "OR 1=1" — always-true condition trick
    /\bUNION\b/i,   // UNION lets attackers merge in data from other tables
    /\bSELECT\b/i,  // SELECT can be used to read data the user shouldn't see
    /\bINSERT\b/i,  // INSERT could add unauthorized records
    /\bUPDATE\b/i,  // UPDATE could overwrite any row
    /\bDELETE\b/i,  // DELETE could wipe rows
    /\bDROP\b/i,    // DROP would delete an entire table
    /\bALTER\b/i,   // ALTER changes the database structure
    /--/,           // -- starts a SQL comment, used to cut off the rest of a query
    /;/,            // ; lets attackers chain multiple SQL statements together
    /\/\*/,         // /* starts a block comment
    /\*\//          // */ ends a block comment
  ];

  // Return true if ANY of the patterns match

  return patterns.some((pattern) => pattern.test(value));
}

// Validates the title

function validateTask(task) {
  const errors = [];

  // Title validation

  if (!task.title || typeof task.title !== "string") {
    errors.push("Subject is required.");
  } else if (task.title.trim().length < 3) {
    errors.push("Subject must be at least 3 characters.");
  } else if (task.title.trim().length > 60) {
    errors.push("Subject must be 60 characters or less.");
  }

  // Description validation

  if (!task.description || typeof task.description !== "string") {
    errors.push("Body is required.");
  } else if (task.description.trim().length < 3) {
    errors.push("Body must be at least 3 characters.");
  } else if (task.description.trim().length > 250) {
    errors.push("Body must be 250 characters or less.");
  }

  // Status validation

  const validStatuses = ["Pending", "In Progress", "Completed"];
  if (!validStatuses.includes(task.status)) {
    errors.push("Status must be Pending, In Progress, or Completed.");
  }

  // SQL injection check

  if (containsSqlInjectionPattern(task.title) || containsSqlInjectionPattern(task.description)) {
    errors.push("Input contains blocked patterns.");
  }

  return errors;
}

// Export functions

module.exports = { validateTask, containsSqlInjectionPattern };
