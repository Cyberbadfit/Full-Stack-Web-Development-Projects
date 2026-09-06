"use strict";

/* CYBERBADFIT Bank Web: local, educational full-stack banking simulation.
 * Public web assets are restricted to ../client. This server directory and its
 * runtime data directory are never served to the browser. */
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const CLIENT_DIR = path.resolve(__dirname, "../client");
const DATA_DIR = path.resolve(__dirname, "data");
const DATABASE_FILE = path.join(DATA_DIR, "bank.json");
const BACKUP_FILE = path.join(DATA_DIR, "backup.json");
const sessions = new Map();
const attempts = new Map();
const SESSION_MS = 60 * 60 * 1000;
const MAX_BODY_BYTES = 16 * 1024;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const types = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; }
function email(value) { return String(value || "").trim().toLowerCase(); }
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function money(value) { return Math.round(Number(value) * 100) / 100; }
function hash(password, salt = crypto.randomBytes(16).toString("hex")) { return { salt, hash: crypto.pbkdf2Sync(password, salt, 210000, 64, "sha512").toString("hex") }; }
function user(name, address, password, role) { const credential = hash(password); return { id: id("USR"), name, email: email(address), role, passwordHash: credential.hash, passwordSalt: credential.salt, createdAt: now(), failedAttempts: 0, locked: false }; }
function verify(password, item) { const left = Buffer.from(item.passwordHash, "hex"); const right = Buffer.from(hash(password, item.passwordSalt).hash, "hex"); return left.length === right.length && crypto.timingSafeEqual(left, right); }
function publicUser(item) { return { id: item.id, name: item.name, email: item.email, role: item.role }; }

function seed() {
  const admin = user("System Administrator", "admin@cyberbadfit.bank", "AdminBank@2026", "admin");
  const employee = user("Neha Verma", "employee@cyberbadfit.bank", "EmployeeBank@2026", "employee");
  const customer = user("Aarav Sharma", "demo@cyberbadfit.bank", "DemoBank@2026", "customer");
  const account = { id: "ACC-1001", customerId: customer.id, number: "10010001", type: "Premium Savings", status: "Active", branchId: "BR-001", balance: 248760.40, minimumBalance: 1000, openedAt: now() };
  return {
    users: [admin, employee, customer],
    customers: [{ id: "CUS-1001", userId: customer.id, name: customer.name, mobile: "9876543210", email: customer.email, kyc: "Verified", rewards: 1250, nominee: "Priya Sharma", createdAt: now() }],
    employees: [{ id: "EMP-1001", userId: employee.id, name: employee.name, designation: "Relationship Manager", branchId: "BR-001", status: "Active" }],
    branches: [{ id: "BR-001", name: "Central Office", city: "Mumbai", ifsc: "CBFT0000001", status: "Active" }],
    accounts: [account],
    transactions: [
      { id: "TXN-94821", accountId: account.id, merchant: "Northstar Market", category: "Groceries", amount: -1860.50, date: "2026-08-03", status: "Completed" },
      { id: "TXN-94822", accountId: account.id, merchant: "Salary Credit", category: "Income", amount: 85000, date: "2026-08-01", status: "Completed" },
      { id: "TXN-94823", accountId: account.id, merchant: "Atlas Power", category: "Utilities", amount: -2340, date: "2026-07-29", status: "Completed" },
      { id: "TXN-94824", accountId: account.id, merchant: "Nova Mobility", category: "Transport", amount: -780, date: "2026-07-28", status: "Completed" },
      { id: "TXN-94825", accountId: account.id, merchant: "Skyline Cafe", category: "Dining", amount: -640, date: "2026-07-27", status: "Completed" }
    ],
    loans: [{ id: "LOAN-1001", customerId: customer.id, accountId: account.id, amount: 150000, annualRate: 10.5, months: 36, emi: 4875, outstanding: 150000, status: "Pending", createdAt: now() }],
    fixedDeposits: [], cards: [{ id: "CARD-1001", accountId: account.id, number: "5100 0000 0000 1001", status: "Active", expiry: "12/31" }], cheques: [],
    notifications: [{ id: id("NOT"), userId: customer.id, message: "Welcome to CYBERBADFIT Bank. Your Premium Savings account is active.", createdAt: now(), read: false }],
    logs: []
  };
}
function ensureDatabase() { fs.mkdirSync(DATA_DIR, { recursive: true }); if (!fs.existsSync(DATABASE_FILE)) fs.writeFileSync(DATABASE_FILE, JSON.stringify(seed(), null, 2), { mode: 0o600 }); }
function database() { ensureDatabase(); return JSON.parse(fs.readFileSync(DATABASE_FILE, "utf8")); }
function save(data) { const tmp = `${DATABASE_FILE}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 }); fs.renameSync(tmp, DATABASE_FILE); }
function log(data, actor, action) { data.logs.unshift({ id: id("LOG"), actorId: actor.id, role: actor.role, action, time: now() }); data.logs = data.logs.slice(0, 100); }
function note(data, userId, message) { data.notifications.unshift({ id: id("NOT"), userId, message, createdAt: now(), read: false }); }

function headers(response) {
  response.setHeader("X-Content-Type-Options", "nosniff"); response.setHeader("X-Frame-Options", "DENY"); response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()"); response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' https://images.unsplash.com data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
}
function json(response, status, value) { headers(response); response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); response.end(JSON.stringify(value)); }
function body(request) { return new Promise((resolve, reject) => { let text = ""; request.on("data", part => { text += part; if (Buffer.byteLength(text) > MAX_BODY_BYTES) { reject(new Error("Request too large")); request.destroy(); } }); request.on("end", () => { try { resolve(text ? JSON.parse(text) : {}); } catch { reject(new Error("Invalid JSON")); } }); request.on("error", reject); }); }
function ip(request) { return request.socket.remoteAddress || "unknown"; }
function limited(request) { const state = attempts.get(ip(request)); return Boolean(state && Date.now() - state.first < LOGIN_WINDOW_MS && state.count >= LOGIN_MAX_ATTEMPTS); }
function fail(request) { const key = ip(request), old = attempts.get(key); if (!old || Date.now() - old.first > LOGIN_WINDOW_MS) attempts.set(key, { first: Date.now(), count: 1 }); else old.count += 1; }
function sessionFor(user) { const token = crypto.randomBytes(32).toString("hex"); sessions.set(token, { userId: user.id, expires: Date.now() + SESSION_MS }); return token; }
function auth(request, data) { const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, ""); const session = sessions.get(token); if (!session || session.expires < Date.now()) { sessions.delete(token); return null; } return data.users.find(item => item.id === session.userId) || null; }
function guard(request, response, data, roles) { const actor = auth(request, data); if (!actor) { json(response, 401, { error: "Your secure session has expired. Please sign in again." }); return null; } if (!roles.includes(actor.role)) { json(response, 403, { error: "This operation is not available for your role." }); return null; } return actor; }
function validAmount(value) { const result = money(value); return Number.isFinite(result) && result > 0 && result <= 10000000 ? result : null; }
function customerFor(data, actor) { return data.customers.find(item => item.userId === actor.id); }
function accountFor(data, actor) { const customer = customerFor(data, actor); return customer && data.accounts.find(item => item.customerId === customer.userId && item.status === "Active"); }
function dashboard(data, actor) {
  if (actor.role === "customer") {
    const account = accountFor(data, actor); const tx = data.transactions.filter(item => item.accountId === account?.id).slice(0, 10); const used = tx.filter(item => item.amount < 0).reduce((sum, item) => sum + Math.abs(item.amount), 0);
    return { user: publicUser(actor), role: actor.role, account: account && { number: `**** ${account.number.slice(-4)}`, type: account.type, balance: account.balance, available: account.balance, rewards: customerFor(data, actor).rewards }, spending: { limit: 20000, used: money(used) }, transactions: tx, notifications: data.notifications.filter(item => item.userId === actor.id).slice(0, 5), services: ["Deposit", "Withdraw", "Transfer", "Apply loan", "Open fixed deposit", "Request card", "Cheque book", "ATM"] };
  }
  const pendingLoans = data.loans.filter(item => item.status === "Pending").length, pendingCheques = data.cheques.filter(item => item.status === "Pending").length;
  return { user: publicUser(actor), role: actor.role, metrics: { customers: data.customers.length, employees: data.employees.length, accounts: data.accounts.length, totalBalance: money(data.accounts.reduce((sum, item) => sum + item.balance, 0)), transactions: data.transactions.length, pendingLoans, pendingCheques }, transactions: data.transactions.slice(0, 8), loans: data.loans.filter(item => item.status === "Pending"), cheques: data.cheques.filter(item => item.status === "Pending"), logs: data.logs.slice(0, 10), services: actor.role === "admin" ? ["Customer management", "Employee management", "Branch management", "Account controls", "Loan approvals", "Cheque approvals", "Reports", "Backup", "Restore"] : ["Register customer", "Open account", "Deposit", "Withdraw", "Transfer", "Loan queue", "Customer search", "Reports"] };
}
function createTransaction(data, account, amount, merchant, category) { const entry = { id: id("TXN"), accountId: account.id, merchant: String(merchant).slice(0, 60), category, amount, date: now().slice(0, 10), status: "Completed" }; data.transactions.unshift(entry); return entry; }
function action(data, actor, input) {
  const type = String(input.type || ""); const amount = validAmount(input.amount);
  if (["deposit", "withdraw", "transfer", "loan", "fd", "card", "cheque", "atm"].includes(type)) {
    if (actor.role !== "customer") throw new Error("Customer account required."); const account = accountFor(data, actor); if (!account) throw new Error("No active customer account found.");
    if (type === "deposit") { if (!amount) throw new Error("Enter a valid deposit amount."); account.balance += amount; createTransaction(data, account, amount, "Cash deposit", "Deposit"); note(data, actor.id, `Rs. ${amount.toFixed(2)} was credited to your account.`); }
    if (type === "withdraw" || type === "atm") { if (!amount) throw new Error("Enter a valid withdrawal amount."); if (account.balance - amount < account.minimumBalance) throw new Error("Withdrawal would breach the minimum balance."); account.balance -= amount; createTransaction(data, account, -amount, type === "atm" ? "ATM cash withdrawal" : "Cash withdrawal", type === "atm" ? "ATM" : "Withdrawal"); note(data, actor.id, `Rs. ${amount.toFixed(2)} was debited from your account.`); }
    if (type === "transfer") { if (!amount || String(input.recipient || "").trim().length < 2) throw new Error("Enter a recipient and a valid amount."); if (account.balance - amount < account.minimumBalance) throw new Error("Transfer would breach the minimum balance."); account.balance -= amount; createTransaction(data, account, -amount, `Transfer to ${String(input.recipient).trim()}`, "Transfer"); note(data, actor.id, `Transfer of Rs. ${amount.toFixed(2)} completed.`); }
    if (type === "loan") { if (!amount) throw new Error("Enter a valid loan amount."); const months = Math.max(1, Math.min(360, Number(input.months) || 36)); const rate = 10.5 / 1200; const emi = money(amount * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1)); data.loans.unshift({ id: id("LOAN"), customerId: actor.id, accountId: account.id, amount, annualRate: 10.5, months, emi, outstanding: amount, status: "Pending", createdAt: now() }); note(data, actor.id, "Your loan application is pending review."); }
    if (type === "fd") { if (!amount) throw new Error("Enter a valid fixed-deposit amount."); if (account.balance - amount < account.minimumBalance) throw new Error("Fixed deposit would breach the minimum balance."); account.balance -= amount; const months = Math.max(1, Math.min(120, Number(input.months) || 12)); data.fixedDeposits.unshift({ id: id("FD"), customerId: actor.id, accountId: account.id, principal: amount, months, rate: 7.2, maturity: money(amount * Math.pow(1.072, months / 12)), status: "Active", createdAt: now() }); createTransaction(data, account, -amount, "Fixed deposit funding", "Fixed Deposit"); note(data, actor.id, "Your fixed deposit is active."); }
    if (type === "card") { data.cards.unshift({ id: id("CARD"), accountId: account.id, number: `5100 0000 0000 ${String(Math.floor(1000 + Math.random() * 8999))}`, status: "Requested", expiry: "12/31" }); note(data, actor.id, "Your debit-card request is pending approval."); }
    if (type === "cheque") { data.cheques.unshift({ id: id("CHQ"), accountId: account.id, leaves: Math.max(10, Math.min(100, Number(input.leaves) || 25)), status: "Pending", createdAt: now() }); note(data, actor.id, "Your cheque-book request is pending approval."); }
    log(data, actor, `Customer service: ${type}`); return `${type.replace(/^./, c => c.toUpperCase())} request completed.`;
  }
  if (type === "create-customer") { if (!["employee", "admin"].includes(actor.role)) throw new Error("Employee access required."); const name = String(input.name || "").trim(), address = email(input.email), password = String(input.password || ""); if (name.length < 2 || !address.includes("@") || password.length < 12) throw new Error("Name, valid email, and 12+ character password are required."); if (data.users.some(item => item.email === address)) throw new Error("An account with that email already exists."); const newUser = user(name, address, password, "customer"); data.users.push(newUser); data.customers.push({ id: id("CUS"), userId: newUser.id, name, mobile: String(input.mobile || "Not provided").slice(0, 20), email: address, kyc: "Pending", rewards: 0, nominee: "Not provided", createdAt: now() }); log(data, actor, `Created customer ${name}`); return "Customer profile created."; }
  if (type === "open-account") { if (!["employee", "admin"].includes(actor.role)) throw new Error("Employee access required."); const person = data.customers.find(item => item.email === email(input.email)); if (!person) throw new Error("Customer email was not found."); const balance = validAmount(input.amount); if (!balance) throw new Error("Enter an initial balance."); const number = String(10000000 + data.accounts.length + 1); data.accounts.push({ id: id("ACC"), customerId: person.userId, number, type: input.accountType === "Current" ? "Current" : "Savings", status: "Active", branchId: "BR-001", balance, minimumBalance: input.accountType === "Current" ? 5000 : 1000, openedAt: now() }); note(data, person.userId, `Your account ending ${number.slice(-4)} is active.`); log(data, actor, `Opened account for ${person.name}`); return `Account ${number} opened.`; }
  if (type === "add-employee" || type === "add-branch") { if (actor.role !== "admin") throw new Error("Administrator access required."); if (type === "add-employee") { const name = String(input.name || "").trim(), address = email(input.email), password = String(input.password || ""); if (name.length < 2 || !address.includes("@") || password.length < 12) throw new Error("Name, email and 12+ character password are required."); const member = user(name, address, password, "employee"); data.users.push(member); data.employees.push({ id: id("EMP"), userId: member.id, name, designation: String(input.designation || "Bank Officer").slice(0, 50), branchId: "BR-001", status: "Active" }); log(data, actor, `Created employee ${name}`); return "Employee profile created."; } const name = String(input.name || "").trim(), city = String(input.city || "").trim(), ifsc = String(input.ifsc || "").trim(); if (name.length < 2 || city.length < 2 || ifsc.length < 4) throw new Error("Branch name, city and IFSC are required."); data.branches.push({ id: id("BR"), name, city, ifsc, status: "Active" }); log(data, actor, `Added branch ${name}`); return "Branch created."; }
  if (type === "process-loan" || type === "process-cheque") { if (!["employee", "admin"].includes(actor.role)) throw new Error("Staff access required."); const collection = type === "process-loan" ? data.loans : data.cheques; const item = collection.find(entry => entry.id === input.id && entry.status === "Pending"); if (!item) throw new Error("Pending request was not found."); item.status = input.decision === "reject" ? "Rejected" : "Approved"; if (type === "process-loan" && item.status === "Approved") { const account = data.accounts.find(entry => entry.id === item.accountId); account.balance += item.amount; createTransaction(data, account, item.amount, "Approved loan disbursal", "Loan"); } const account = data.accounts.find(entry => entry.id === item.accountId); if (account) { const owner = data.customers.find(entry => entry.userId === account.customerId); if (owner) note(data, owner.userId, `${type === "process-loan" ? "Loan" : "Cheque-book"} request ${item.status.toLowerCase()}.`); } log(data, actor, `${item.status} ${type}`); return `Request ${item.status.toLowerCase()}.`; }
  if (type === "backup" || type === "restore") { if (actor.role !== "admin") throw new Error("Administrator access required."); if (type === "backup") { fs.writeFileSync(BACKUP_FILE, JSON.stringify({ createdAt: now(), data }, null, 2), { mode: 0o600 }); log(data, actor, "Created encrypted-local-demo backup"); return "Backup snapshot created."; } if (!fs.existsSync(BACKUP_FILE)) throw new Error("No backup snapshot is available."); const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8")); if (!backup.data || !Array.isArray(backup.data.users)) throw new Error("Backup validation failed."); save(backup.data); return "Backup restored. Sign in again to refresh your session."; }
  throw new Error("Unknown service action.");
}

async function api(request, response, pathname) {
  const data = database();
  if (request.method === "GET" && pathname === "/api/health") return json(response, 200, { status: "ok", service: "CYBERBADFIT Bank API" });
  if (request.method === "POST" && pathname === "/api/login") { if (limited(request)) return json(response, 429, { error: "Too many attempts. Try again in 15 minutes." }); const input = await body(request); const item = data.users.find(entry => entry.email === email(input.email)); if (!item || item.locked || !verify(String(input.password || ""), item)) { fail(request); if (item) { item.failedAttempts += 1; if (item.failedAttempts >= 3) item.locked = true; save(data); } return json(response, 401, { error: "Invalid credentials or locked account." }); } item.failedAttempts = 0; save(data); attempts.delete(ip(request)); return json(response, 200, { token: sessionFor(item), user: publicUser(item) }); }
  if (request.method === "POST" && pathname === "/api/signup") { const input = await body(request); const name = String(input.name || "").trim(), address = email(input.email), password = String(input.password || ""); if (name.length < 2 || !address.includes("@") || password.length < 12) return json(response, 400, { error: "Enter a name, valid email and 12+ character password." }); if (data.users.some(item => item.email === address)) return json(response, 409, { error: "An account with that email already exists." }); const item = user(name, address, password, "customer"); data.users.push(item); data.customers.push({ id: id("CUS"), userId: item.id, name, mobile: "Not provided", email: address, kyc: "Pending", rewards: 0, nominee: "Not provided", createdAt: now() }); note(data, item.id, "Welcome. Complete your profile with an employee to activate banking services."); log(data, item, "Customer self-registration"); save(data); return json(response, 201, { token: sessionFor(item), user: publicUser(item) }); }
  if (request.method === "POST" && pathname === "/api/logout") { sessions.delete(String(request.headers.authorization || "").replace(/^Bearer\s+/i, "")); return json(response, 204, {}); }
  if (request.method === "GET" && pathname === "/api/dashboard") { const actor = guard(request, response, data, ["customer", "employee", "admin"]); if (!actor) return; return json(response, 200, dashboard(data, actor)); }
  if (request.method === "GET" && pathname === "/api/records") { const actor = guard(request, response, data, ["employee", "admin"]); if (!actor) return; const kind = new URL(request.url, "http://localhost").searchParams.get("kind"); const permitted = { customers: data.customers, employees: data.employees, branches: data.branches, accounts: data.accounts, transactions: data.transactions, loans: data.loans, fixedDeposits: data.fixedDeposits, cards: data.cards, cheques: data.cheques, logs: data.logs }; if (!permitted[kind]) return json(response, 400, { error: "Unknown record type." }); if (actor.role === "employee" && ["employees", "branches", "logs"].includes(kind)) return json(response, 403, { error: "Administrator access required." }); return json(response, 200, { items: permitted[kind] }); }
  if (request.method === "POST" && pathname === "/api/action") { const actor = guard(request, response, data, ["customer", "employee", "admin"]); if (!actor) return; try { const result = action(data, actor, await body(request)); if (!String(result).startsWith("Backup restored")) save(data); return json(response, 200, { message: result, dashboard: dashboard(database(), actor) }); } catch (error) { return json(response, 400, { error: error.message }); } }
  return json(response, 404, { error: "API route not found." });
}
function serve(response, pathname) { const requestPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, ""); const file = path.resolve(CLIENT_DIR, requestPath); if (file !== CLIENT_DIR && !file.startsWith(`${CLIENT_DIR}${path.sep}`)) return json(response, 403, { error: "Forbidden" }); fs.readFile(file, (error, content) => { if (error) return json(response, error.code === "ENOENT" ? 404 : 500, { error: "Page not found." }); headers(response); response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }); response.end(content); }); }
ensureDatabase(); setInterval(() => { for (const [token, session] of sessions) if (session.expires < Date.now()) sessions.delete(token); }, 600000).unref();
http.createServer(async (request, response) => { const url = new URL(request.url, `http://${request.headers.host || "localhost"}`); try { if (url.pathname.startsWith("/api/")) await api(request, response, url.pathname); else if (request.method === "GET") serve(response, url.pathname); else json(response, 405, { error: "Method not allowed." }); } catch (error) { console.error(error); if (!response.headersSent) json(response, 400, { error: "The request could not be processed." }); } }).listen(PORT, "127.0.0.1", () => console.log(`CYBERBADFIT Bank Web running at http://localhost:${PORT}`));
