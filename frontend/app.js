

let currentPage    = "dashboard"; 
let editingTaskId  = null;   

// DOM references 

const table        = document.getElementById("table");
const titleInput   = document.getElementById("title");
const descInput    = document.getElementById("description");
const statusInput  = document.getElementById("status");
const messageBox   = document.getElementById("message");
const saveBtn      = document.getElementById("saveBtn");
const cancelBtn    = document.getElementById("cancelBtn");
const formSection  = document.getElementById("form-section");
const statsSection = document.getElementById("stats-section");

// Navigation 

document.querySelectorAll(".sidebar a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault(); 
    navigateTo(link.dataset.page); 
  });
});

// Switch to a different page tab

function navigateTo(page) {
  currentPage = page;


  document.querySelectorAll(".sidebar a").forEach(a =>
    a.classList.toggle("active", a.dataset.page === page)
  );

 

  const showForm = page === "dashboard" || page === "tasks";
  formSection.style.display = showForm ? "" : "none";


  if (!showForm) cancelEdit();

  showMessage(""); 
  load();         
}

// Status messages

function showMessage(text, isError = false) {
  messageBox.textContent = text;
  messageBox.className = text
    ? ("message " + (isError ? "error" : "success"))
    : "message"; 
}

// Output escaping

function escapeHtml(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// escapeJs — makes text safe to embed inside a JS string inside an onclick=""

function escapeJs(v) {
  return String(v)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n") 
    .replace(/\r/g, "\\r");
}

// Timestamp formatting 

function fmt(ts) {
  if (!ts) return "—";

  // SQLite stores timestamps with a space; the Date constructor needs a "T"

  const d = new Date(ts.replace(" ", "T"));
  if (isNaN(d)) return ts; 

  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

// Form helpers

function cancelEdit() {
  editingTaskId       = null;
  titleInput.value    = "";
  descInput.value     = "";
  statusInput.value   = "Pending";
  saveBtn.textContent = "Save";
  cancelBtn.style.display = "none";
}

// Cancel button — exit edit mode without saving

cancelBtn.addEventListener("click", () => {
  cancelEdit();
  showMessage("");
});

// Client-side validation

function validateClient() {
  const title  = titleInput.value.trim();
  const desc   = descInput.value.trim();
  const status = statusInput.value;

  if (title.length < 3)  return "Subject must be at least 3 characters.";
  if (title.length > 60) return "Subject must be 60 characters or less.";
  if (desc.length < 3)   return "Body must be at least 3 characters.";
  if (desc.length > 250) return "Body must be 250 characters or less.";

  // Quick SQL injection / XSS pattern check on the client side

  const blocked = /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+|\bDROP\b|--|;|<script/i;
  if (blocked.test(title) || blocked.test(desc)) return "Input contains blocked patterns.";

  if (!["Pending", "In Progress", "Completed"].includes(status)) return "Please choose a valid status.";

  return null; // null means no errors — all good
}

// Stats panel 

function updateStats(data) {
  const active = data.filter(t => t.deleted !== 1);

  document.getElementById("stat-total").textContent     = active.length;
  document.getElementById("stat-pending").textContent   = active.filter(t => t.status === "Pending").length;
  document.getElementById("stat-progress").textContent  = active.filter(t => t.status === "In Progress").length;
  document.getElementById("stat-completed").textContent = active.filter(t => t.status === "Completed").length;
  document.getElementById("stat-deleted").textContent   = data.filter(t => t.deleted === 1).length;
}

// Data loading

async function load() {
  try {
    const res  = await fetch("/api/tasks");     
    const data = await res.json();             

    updateStats(data); // always update the stat cards with fresh data

    if (currentPage === "dashboard") {
      const active = data.filter(t => t.deleted !== 1);
    
      statsSection.style.display = active.length ? "" : "none";
      table.style.display = "none";
      return;
    }


    table.style.display = "";
    statsSection.style.display = "none";


    if (currentPage === "tasks") {
    
      renderTasks(data.filter(t => t.deleted !== 1 && t.status !== "Completed"), "tasks");
    } else if (currentPage === "completed") {
      renderTasks(data.filter(t => t.deleted !== 1 && t.status === "Completed"), "completed");
    } else if (currentPage === "deleted") {
      renderTasks(data.filter(t => t.deleted === 1), "deleted");
    }
  } catch {
    showMessage("Failed to load tasks.", true);
  }
}

// Rendering

function statusBadge(status) {
  const cls = "status-" + status.replace(/ /g, "-").toLowerCase();
  return `<span class="status-badge ${cls}">${escapeHtml(status)}</span>`;
}



function renderTasks(tasks, pageType) {
  const isDeleted   = pageType === "deleted";
  const isCompleted = pageType === "completed";


  let headers = `<th>ID</th><th>Title</th><th>Description</th><th>Status</th><th>Created</th>`;
  if (isCompleted) headers += `<th>Completed</th>`; 
  if (isDeleted)   headers += `<th>Deleted</th>`;   
  headers += `<th>Actions</th>`;

  if (!tasks.length) {
    table.innerHTML = `<tr>${headers}</tr>
      <tr><td colspan="6" style="padding:24px;color:#64748b">No tasks here.</td></tr>`;
    return;
  }

  const rows = tasks.map(t => {

    let timeCols = `<td class="ts-cell">${fmt(t.created_at)}</td>`;
    if (isCompleted) timeCols += `<td class="ts-cell">${fmt(t.completed_at)}</td>`;
    if (isDeleted)   timeCols += `<td class="ts-cell">${fmt(t.deleted_at)}</td>`;

    let actions = "";
    if (isDeleted) {
      actions = `<button onclick="restoreTask(${t.id})">Restore</button>`;
    } else {
      actions = `
        <button onclick="editTask(${t.id},'${escapeJs(t.title)}','${escapeJs(t.description)}','${escapeJs(t.status)}')">Edit</button>
        ${t.status !== "In Progress" ? `<button onclick="changeStatus(${t.id},'In Progress')">In Progress</button>` : ""}
        ${t.status !== "Completed"   ? `<button onclick="changeStatus(${t.id},'Completed')">Complete</button>` : ""}
        <button class="delete-btn" onclick="deleteTask(${t.id})">Delete</button>
      `;
    }

    return `<tr>
      <td>${t.id}</td>
      <td>${escapeHtml(t.title)}</td>
      <td>${escapeHtml(t.description)}</td>
      <td>${statusBadge(t.status)}</td>
      ${timeCols}
      <td><div class="actions">${actions}</div></td>
    </tr>`;
  }).join("");

  table.innerHTML = `<tr>${headers}</tr>${rows}`;
}

// Save
saveBtn.addEventListener("click", saveTask);

async function saveTask() {

  const clientError = validateClient();
  if (clientError) { showMessage(clientError, true); return; }

  const payload = {
    title:       titleInput.value.trim(),
    description: descInput.value.trim(),
    status:      statusInput.value,
    deleted:     0 
  };


  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  try {

    const url    = editingTaskId ? `/api/tasks/${editingTaskId}` : "/api/tasks";
    const method = editingTaskId ? "PUT" : "POST";

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload) 
    });
    const data = await res.json();


    if (!res.ok) {
      showMessage(data.errors ? data.errors.join(" ") : (data.error || "Request failed."), true);
      return;
    }

    const wasEditing = !!editingTaskId; 
    cancelEdit();
    showMessage(wasEditing ? "Task updated!" : "Task created! Redirecting to Task Page…");

    if (!wasEditing) {

      setTimeout(() => navigateTo("tasks"), 800);
    } else {
      load();
    }
  } catch {
    showMessage("Request failed.", true);
  } finally {
    saveBtn.disabled = false;
    if (!editingTaskId) saveBtn.textContent = "Save";
  }
}

// Edit
function editTask(id, title, description, status) {
  editingTaskId       = id;
  titleInput.value    = title;
  descInput.value     = description;
  statusInput.value   = status;
  saveBtn.textContent = "Update";
  cancelBtn.style.display = ""; 
  showMessage("Editing task #" + id);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Change status
async function changeStatus(id, newStatus) {
  try {
    const res  = await fetch(`/api/tasks/${id}`);
    const task = await res.json();

    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:       task.title,
        description: task.description,
        status:      newStatus,      
        deleted:     task.deleted || 0
      })
    });

    showMessage(`Task marked as "${newStatus}".`);
    load(); 
  } catch {
    showMessage("Failed to update status.", true);
  }
}

// Delete (soft)
async function deleteTask(id) {
  if (!window.confirm("Move this task to Deleted Tasks?")) return;

  try {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });


    if (editingTaskId === id) cancelEdit();

    showMessage("Task moved to Deleted Tasks.");
    load();
  } catch {
    showMessage("Failed to delete task.", true);
  }
}

//Restore

async function restoreTask(id) {
  if (!window.confirm("Restore this task?")) return;

  try {
    const res  = await fetch(`/api/tasks/${id}`);
    const task = await res.json();

    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:       task.title,
        description: task.description,
        status:      task.status,
        deleted:     0 
      })
    });

    showMessage("Task restored.");
    load();
  } catch {
    showMessage("Failed to restore task.", true);
  }
}

load();
