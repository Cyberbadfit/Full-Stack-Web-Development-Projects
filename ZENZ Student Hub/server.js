const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIRECTORY = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIRECTORY, 'students.json');
const COURSES = new Set(['BCA', 'B.Tech CS', 'CSE', 'AI/ML']);

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

function clean(value, maxLength = 120) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
}

function validateStudent(body) {
  const student = {
    name: clean(body.name, 80),
    email: clean(body.email, 120).toLowerCase(),
    phone: clean(body.phone, 25),
    course: clean(body.course, 30),
    rollNo: clean(body.rollNo, 20)
  };
  if (!student.name || !student.email || !student.course || !student.rollNo) return { error: 'Name, email, programme, and roll number are required.' };
  if (!/^\S+@\S+\.\S+$/.test(student.email)) return { error: 'Enter a valid email address.' };
  if (!COURSES.has(student.course)) return { error: 'Select a valid programme.' };
  return { student };
}

async function readStudents() {
  const raw = await fsp.readFile(DATA_FILE, 'utf8');
  const students = JSON.parse(raw);
  if (!Array.isArray(students)) throw new Error('Student data must be an array.');
  return students;
}

async function writeStudents(students) {
  const temporary = `${DATA_FILE}.tmp`;
  await fsp.writeFile(temporary, `${JSON.stringify(students, null, 2)}\n`, 'utf8');
  await fsp.rename(temporary, DATA_FILE);
}

function sendError(res, error) {
  console.error(error);
  res.status(500).json({ error: 'The student directory could not be updated. Please try again.' });
}

app.get('/api/students', async (_req, res) => {
  try { res.json(await readStudents()); } catch (error) { sendError(res, error); }
});

app.post('/api/students', async (req, res) => {
  const { student, error } = validateStudent(req.body || {});
  if (error) return res.status(400).json({ error });
  try {
    const students = await readStudents();
    if (students.some(item => item.email === student.email)) return res.status(409).json({ error: 'A student with this email already exists.' });
    if (students.some(item => item.rollNo.toLowerCase() === student.rollNo.toLowerCase())) return res.status(409).json({ error: 'This roll number is already in use.' });
    const created = { id: crypto.randomUUID(), ...student, createdAt: new Date().toISOString() };
    students.push(created);
    await writeStudents(students);
    res.status(201).json(created);
  } catch (caught) { sendError(res, caught); }
});

app.put('/api/students/:id', async (req, res) => {
  const { student, error } = validateStudent(req.body || {});
  if (error) return res.status(400).json({ error });
  try {
    const students = await readStudents();
    const index = students.findIndex(item => item.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Student not found.' });
    if (students.some((item, itemIndex) => itemIndex !== index && item.email === student.email)) return res.status(409).json({ error: 'A student with this email already exists.' });
    if (students.some((item, itemIndex) => itemIndex !== index && item.rollNo.toLowerCase() === student.rollNo.toLowerCase())) return res.status(409).json({ error: 'This roll number is already in use.' });
    const updated = { ...students[index], ...student, updatedAt: new Date().toISOString() };
    students[index] = updated;
    await writeStudents(students);
    res.json(updated);
  } catch (caught) { sendError(res, caught); }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const students = await readStudents();
    const remaining = students.filter(item => item.id !== req.params.id);
    if (remaining.length === students.length) return res.status(404).json({ error: 'Student not found.' });
    await writeStudents(remaining);
    res.status(204).end();
  } catch (error) { sendError(res, error); }
});

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/style.css', (_req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/script.js', (_req, res) => res.sendFile(path.join(__dirname, 'script.js')));
app.get('/robots.txt', (_req, res) => res.sendFile(path.join(__dirname, 'robots.txt')));
app.get('/sitemap.xml', (_req, res) => res.sendFile(path.join(__dirname, 'sitemap.xml')));
app.use((_req, res) => res.status(404).send('Page not found.'));

async function start() {
  await fsp.mkdir(DATA_DIRECTORY, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) await writeStudents([]);
  app.listen(PORT, () => console.log(`ZENZ Student Hub is running at http://localhost:${PORT}`));
}

start().catch(error => { console.error('Unable to start ZENZ Student Hub:', error); process.exitCode = 1; });
