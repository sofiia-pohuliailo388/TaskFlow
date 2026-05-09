# E2E User Story Tests — TaskFlow

Run these with Claude Code + Puppeteer MCP while the app is running at http://localhost:5173 (frontend dev server) and http://localhost:8000 (backend).

## How to run

1. Start the backend: `cd backend && uvicorn app.main:app --reload`
2. Start the frontend: `cd frontend && npm run dev`
3. Open a new Claude Code session in this project
4. Ask Claude Code: "Run the e2e user story tests from tests/e2e/user_stories.md"

Claude Code will use the Puppeteer MCP to open Chrome and execute each scenario.

---

## US-01 — User Registration

**Given** I am on the registration page  
**When** I fill in name, email, and a strong password and submit  
**Then** I should be redirected to /tasks  
**And** my name should appear in the navbar

Steps:
1. Navigate to http://localhost:5173/register
2. Fill `input[name="name"]` with "Test User"
3. Fill `input[name="email"]` with "e2e_test@example.com"
4. Fill `input[name="password"]` with "TestPass123"
5. Click the "Register" button
6. Assert current URL is /tasks
7. Assert navbar contains "Test User"

---

## US-02 — Login and Logout

**Given** I have a registered account  
**When** I log in with correct credentials  
**Then** I should see my tasks page  
**When** I click Sign out  
**Then** I should be redirected to /login

Steps:
1. Navigate to http://localhost:5173/login
2. Fill email "e2e_test@example.com", password "TestPass123"
3. Click "Sign in"
4. Assert URL is /tasks
5. Click the "Sign out" button
6. Assert URL is /login

---

## US-03 — Create a Task

**Given** I am logged in  
**When** I click "+ New task" and fill in a title  
**Then** the task should appear in the list with status "To Do" and priority "Medium"

Steps:
1. Log in as e2e_test@example.com
2. Click the "+ New task" button
3. Fill title "Buy groceries"
4. Select priority "High"
5. Click "Create task"
6. Assert the task card with title "Buy groceries" is visible
7. Assert it shows the "To Do" status badge
8. Assert it shows the "High" priority badge

---

## US-04 — Move Task Through Statuses

**Given** I have a "To Do" task  
**When** I click "In Progress" on the task card  
**Then** the status badge should change to "In Progress"  
**When** I click "Done"  
**Then** the status badge should change to "Done"  
**And** the "Done" task should have no status-change buttons

Steps:
1. Create task "Status Flow Test"
2. Click the "In Progress" button on that task card
3. Assert badge shows "In Progress"
4. Click the "Done" button
5. Assert badge shows "Done"
6. Assert no "In Progress" or "To Do" transition buttons are visible

---

## US-05 — Filter Tasks by Status

**Given** I have tasks in different statuses  
**When** I click the "In Progress" filter tab  
**Then** only In Progress tasks should be visible

Steps:
1. Create tasks: "Task A" (leave as To Do), "Task B" (move to In Progress)
2. Click the "In Progress" filter tab
3. Assert only "Task B" is visible
4. Assert "Task A" is not visible
5. Click "All" tab → both tasks are visible

---

## US-06 — Add Subtasks

**Given** I have a task  
**When** I open it, go to the Subtasks tab, and add subtasks  
**Then** the subtasks should appear with unchecked checkboxes  
**When** I check one  
**Then** it should appear crossed out

Steps:
1. Create task "Project X"
2. Click Edit on "Project X"
3. Click "Subtasks" tab
4. Type "Write tests" in the subtask input and click Add
5. Type "Deploy" in the subtask input and click Add
6. Assert both subtasks appear
7. Check "Write tests" checkbox
8. Assert "Write tests" is struck through

---

## US-07 — Add Attachments to Task

**Given** I have a task  
**When** I open it, go to Attachments tab, and add a Google Drive link  
**Then** the link should appear with a folder icon

Steps:
1. Create task "Design Work"
2. Click Edit on "Design Work"
3. Click "Attachments" tab
4. Fill label "Design doc", URL "https://drive.google.com/file/d/example"
5. Click Add
6. Assert attachment row appears with the folder icon (📂) and label "Design doc"
7. Click the link and verify it opens in a new tab

---

## US-08 — Add Attachment to Subtask

**Given** I have a task with a subtask  
**When** I click the 📎 button on the subtask and add a link  
**Then** the link should appear under that subtask

Steps:
1. Create task "Research"
2. Add subtask "Read article"
3. Click 📎 on "Read article"
4. Fill name "Article", URL "https://example.com/article"
5. Click Add
6. Assert the attachment appears under "Read article"

---

## US-09 — Kanban Board Drag and Drop

**Given** I have tasks in different statuses  
**When** I navigate to /kanban  
**Then** tasks appear in the correct columns  
**When** I drag a "To Do" task to "In Progress"  
**Then** it should move to the In Progress column

Steps:
1. Ensure there is at least one "To Do" task
2. Navigate to /kanban
3. Assert the task appears in the "To Do" column
4. Drag the task card to the "In Progress" column
5. Assert the task now appears in "In Progress"
6. Verify via /tasks page that the status changed

---

## US-10 — Delete Task

**Given** I have a task  
**When** I click ✕ and confirm deletion  
**Then** the task should disappear from the list

Steps:
1. Create task "Temp Task"
2. Click the ✕ button on "Temp Task"
3. Assert a confirmation prompt appears with the task name
4. Click "Delete"
5. Assert "Temp Task" is no longer in the list
