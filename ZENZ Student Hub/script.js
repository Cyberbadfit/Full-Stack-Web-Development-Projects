class StudentHub {
  constructor() {
    this.students = [];
    this.query = '';
    this.course = '';
    this.form = document.querySelector('#studentForm');
    this.editModal = document.querySelector('#editModal');
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadStudents();
    document.querySelector('#year').textContent = new Date().getFullYear();
    this.setupReveals();
    window.addEventListener('scroll', () => document.querySelector('.site-header').classList.toggle('scrolled', window.scrollY > 12), { passive: true });
  }

  bindEvents() {
    this.form.addEventListener('submit', event => this.createStudent(event));
    document.querySelector('#searchInput').addEventListener('input', event => { this.query = event.target.value.trim(); this.render(); });
    document.querySelector('#courseFilter').addEventListener('change', event => { this.course = event.target.value; this.render(); });
    document.querySelector('#clearFilters').addEventListener('click', () => this.clearFilters());
    document.querySelectorAll('.programme-card').forEach(card => card.addEventListener('click', () => {
      this.course = card.dataset.course;
      document.querySelector('#courseFilter').value = this.course;
      document.querySelector('#searchInput').value = '';
      this.query = '';
      this.render();
      document.querySelector('#students').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    document.querySelector('#studentsList').addEventListener('click', event => {
      const action = event.target.closest('[data-action]');
      if (!action) return;
      const id = action.dataset.id;
      if (action.dataset.action === 'edit') this.openEditor(id);
      if (action.dataset.action === 'delete') this.deleteStudent(id);
    });
    document.querySelector('#saveEdit').addEventListener('click', () => this.saveEdit());
    document.querySelector('.nav-toggle').addEventListener('click', () => this.toggleNavigation());
    document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => this.closeNavigation()));
    this.editModal.addEventListener('close', () => document.querySelector('#editError').textContent = '');
  }

  async request(path, options = {}) {
    const response = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Something went wrong. Please try again.');
    return payload;
  }

  async loadStudents() {
    try {
      this.students = await this.request('/students');
      this.render();
      this.updateSummary();
    } catch (error) {
      this.showToast('Could not load the student directory. Start the server and refresh.', true);
      document.querySelector('#studentTrend').textContent = 'Directory unavailable';
    }
  }

  getFormData(prefix = '') {
    const value = id => document.querySelector(`#${prefix}${id}`).value.trim();
    return { name: value('Name'), email: value('Email'), course: value('Course'), rollNo: value('RollNo'), phone: value('Phone') };
  }

  async createStudent(event) {
    event.preventDefault();
    const data = this.getFormData('');
    const error = this.validate(data);
    document.querySelector('#formError').textContent = error || '';
    if (error) return;
    const button = this.form.querySelector('button[type="submit"]');
    this.setLoading(button, true, 'Creating…');
    try {
      const student = await this.request('/students', { method: 'POST', body: JSON.stringify(data) });
      this.students.push(student);
      this.form.reset();
      this.render();
      this.updateSummary();
      this.showToast(`${student.name} has been added to the directory.`);
    } catch (error) {
      document.querySelector('#formError').textContent = error.message;
    } finally {
      this.setLoading(button, false, 'Create student record');
    }
  }

  validate(data) {
    if (!data.name || !data.email || !data.course || !data.rollNo) return 'Please complete all required fields.';
    if (!/^\S+@\S+\.\S+$/.test(data.email)) return 'Enter a valid email address.';
    return '';
  }

  filteredStudents() {
    const term = this.query.toLowerCase();
    return this.students.filter(student => {
      const matchingCourse = !this.course || student.course === this.course;
      const haystack = `${student.name} ${student.email} ${student.rollNo} ${student.course}`.toLowerCase();
      return matchingCourse && (!term || haystack.includes(term));
    });
  }

  render() {
    const visible = this.filteredStudents();
    const list = document.querySelector('#studentsList');
    document.querySelector('#resultsCount').textContent = `${visible.length} ${visible.length === 1 ? 'record' : 'records'}`;
    document.querySelector('#clearFilters').hidden = !this.query && !this.course;
    document.querySelector('#noStudents').hidden = visible.length !== 0;
    list.innerHTML = visible.map((student, index) => this.studentRow(student, index)).join('');
  }

  studentRow(student, index) {
    const initials = student.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    const variants = ['', 'alt', 'coral', 'gold'];
    return `<tr>
      <td><span class="student-name"><i class="avatar ${variants[index % variants.length]}">${this.escape(initials)}</i><span>${this.escape(student.name)}<small class="student-email">${this.escape(student.email)}</small></span></span></td>
      <td><span class="course-pill">${this.escape(student.course)}</span></td>
      <td>${this.escape(student.rollNo)}</td>
      <td>${this.escape(student.phone || '—')}</td>
      <td><button class="action-menu" type="button" data-action="edit" data-id="${this.escape(student.id)}" aria-label="Edit ${this.escape(student.name)}">Edit</button><button class="action-menu" type="button" data-action="delete" data-id="${this.escape(student.id)}" aria-label="Delete ${this.escape(student.name)}">Delete</button></td>
    </tr>`;
  }

  updateSummary() {
    const total = this.students.length;
    const counts = { BCA: 0, 'B.Tech CS': 0, CSE: 0, 'AI/ML': 0 };
    this.students.forEach(student => { if (Object.hasOwn(counts, student.course)) counts[student.course] += 1; });
    document.querySelector('#studentsCount').textContent = total;
    document.querySelector('#heroStudentCount').textContent = total || '0';
    document.querySelector('#studentTrend').textContent = total ? `${total} organised student records` : 'Ready for your first record';
    const [largestCourse, largestCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    document.querySelector('#largestCourse').textContent = total ? largestCourse : '—';
    document.querySelector('#largestCourseCount').textContent = total ? `${largestCount} enrolled students` : 'No enrolments yet';
    document.querySelector('#bca-count').textContent = `${counts.BCA} students`;
    document.querySelector('#btech-count').textContent = `${counts['B.Tech CS']} students`;
    document.querySelector('#cse-count').textContent = `${counts.CSE} students`;
    document.querySelector('#aiml-count').textContent = `${counts['AI/ML']} students`;
  }

  clearFilters() {
    this.query = ''; this.course = '';
    document.querySelector('#searchInput').value = '';
    document.querySelector('#courseFilter').value = '';
    this.render();
  }

  openEditor(id) {
    const student = this.students.find(item => item.id === id);
    if (!student) return;
    document.querySelector('#editId').value = student.id;
    document.querySelector('#editName').value = student.name;
    document.querySelector('#editEmail').value = student.email;
    document.querySelector('#editCourse').value = student.course;
    document.querySelector('#editRollNo').value = student.rollNo;
    document.querySelector('#editPhone').value = student.phone || '';
    this.editModal.showModal();
  }

  async saveEdit() {
    const id = document.querySelector('#editId').value;
    const data = this.getFormData('edit');
    const error = this.validate(data);
    document.querySelector('#editError').textContent = error || '';
    if (error) return;
    const button = document.querySelector('#saveEdit');
    this.setLoading(button, true, 'Saving…');
    try {
      const updated = await this.request(`/students/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
      this.students = this.students.map(student => student.id === id ? updated : student);
      this.editModal.close(); this.render(); this.updateSummary();
      this.showToast('Student record updated.');
    } catch (error) { document.querySelector('#editError').textContent = error.message; }
    finally { this.setLoading(button, false, 'Save changes'); }
  }

  async deleteStudent(id) {
    const student = this.students.find(item => item.id === id);
    if (!student || !window.confirm(`Delete ${student.name}'s record? This cannot be undone.`)) return;
    try {
      await this.request(`/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
      this.students = this.students.filter(item => item.id !== id);
      this.render(); this.updateSummary();
      this.showToast('Student record deleted.');
    } catch (error) { this.showToast(error.message, true); }
  }

  setLoading(button, isLoading, label) { button.disabled = isLoading; button.textContent = label; }
  escape(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]); }
  showToast(message, isError = false) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.style.background = isError ? '#a73645' : ''; toast.classList.add('show'); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => toast.classList.remove('show'), 3800); }
  toggleNavigation() { const menu = document.querySelector('.nav-links'); const toggle = document.querySelector('.nav-toggle'); const open = menu.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); }
  closeNavigation() { document.querySelector('.nav-links').classList.remove('open'); document.querySelector('.nav-toggle').setAttribute('aria-expanded', 'false'); }
  setupReveals() { const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 }); document.querySelectorAll('.reveal').forEach(item => observer.observe(item)); }
}

document.addEventListener('DOMContentLoaded', () => new StudentHub());
