// teacher_dashboard.js
// Place this file in project/teacher/teacher_dashboard.js

// Local state
let subjects = [
    "English Language","French","Shona / Mutauro","Mathematics","Biology","Chemistry",
    "Physics","Combined Science","Geography","Agriculture","Computer Science",
    "Heritage Studies","Religious Studies","Literature in English","Accounting",
    "Business Studies","Textile Tech & Design","Building Tech & Design"
  ];
  
  let studentVerified = false;   // will be true after successful search
  
  document.addEventListener("DOMContentLoaded", () => {
    initYearSelect();
    populateSubjects();
    wireEvents();
    loadResults();            // initial load
  });
  
  // ---------------- utils ----------------
  function $(id){ return document.getElementById(id); }
  
  function initYearSelect() {
    const sel = $('year');
    const current = new Date().getFullYear();
    for (let y = current - 5; y <= current + 1; y++) {
      const o = document.createElement('option'); o.value = y; o.textContent = y;
      if (y === current) o.selected = true;
      sel.appendChild(o);
    }
  }
  
  function populateSubjects() {
    const sel = $('subject');
    sel.innerHTML = '<option value="">Select Subject</option>';
    subjects.forEach(s => {
      const o = document.createElement('option'); o.value = s; o.textContent = s;
      sel.appendChild(o);
    });
    // add Add New option as last
    const last = document.createElement('option'); last.value = '__add__'; last.textContent = '-- Add New Subject --';
    sel.appendChild(last);
  
    // filterSubject
    const f = $('filterSubject');
    f.innerHTML = '<option value="">All</option>';
    subjects.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; f.appendChild(o); });
  }
  
  function wireEvents() {
    $('addSubjectBtn').addEventListener('click', toggleNewSubject);
    $('newSubject').addEventListener('keydown', (e) => { if (e.key === 'Enter') { addNewSubject(); e.preventDefault(); }});
    $('subject').addEventListener('change', (e) => { if (e.target.value === '__add__') toggleNewSubject(); });
    $('btnSearch').addEventListener('click', onSearchStudent);
    $('marks').addEventListener('input', updateGradePreview);
    $('btnSave').addEventListener('click', onSaveResult);
    $('btnClear').addEventListener('click', clearForm);
    $('btnApply').addEventListener('click', loadResults);
  }
  
  // --------------- subject helpers ---------------
  function toggleNewSubject() {
    const inp = $('newSubject');
    inp.style.display = inp.style.display === 'block' ? 'none' : 'block';
    if (inp.style.display === 'block') inp.focus();
  }
  
  function addNewSubject() {
    const val = $('newSubject').value.trim();
    if (!val) return alert('Enter subject name');
    if (!subjects.includes(val)) {
      subjects.push(val);
      populateSubjects();
      $('subject').value = val;
    }
    $('newSubject').value = '';
    $('newSubject').style.display = 'none';
  }
  
  // ----------------- search student -----------------
  async function onSearchStudent() {
    const student_id = $('studentID').value.trim();
    const name = $('studentName').value.trim();
    if (!student_id && !name) return alert('Enter Student ID (or name) to search');
  
    try {
      const res = await fetch('/search_student', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({student_id, name})
      });
      if (res.status !== 200) {
        studentVerified = false;
        const j = await res.json().catch(()=>({}));
        $('foundStudent').textContent = 'Not found';
        return alert(j.message || 'Search failed');
      }
      const j = await res.json();
      if (!j.found) {
        studentVerified = false;
        $('foundStudent').textContent = 'Not found';
        return alert('Student ID not found in database.db. Please add the student first.');
      }
      studentVerified = true;
      const s = j.student;
      $('foundStudent').textContent = `${s.student_id} — ${s.name} ${s.surname || ''} (${s.class})`;
      // auto-fill form fields
      $('studentID').value = s.student_id;
      $('studentName').value = s.name;
      $('form').value = s.class || '';
    } catch (err) {
      console.error(err);
      alert('Search error');
    }
  }
  
  // ---------------- grade calc / preview ----------------
  function calculateGrade(marks) {
    const a = Number($('gradeAStart').value) || 80;
    const b = Number($('gradeBStart').value) || 70;
    const c = Number($('gradeCStart').value) || 60;
    const d = Number($('gradeDStart').value) || 50;
    marks = Number(marks);
    if (isNaN(marks)) return '';
    if (marks >= a) return 'A';
    if (marks >= b) return 'B';
    if (marks >= c) return 'C';
    if (marks >= d) return 'D';
    return 'E';
  }
  
  function calculateStatus(grade) {
    if (grade === 'A') return 'Excellent';
    if (grade === 'B') return 'Good';
    if (grade === 'C') return 'Satisfactory';
    if (grade === 'D') return 'Pass';
    return 'Fail';
  }
  
  function updateGradePreview() {
    const m = $('marks').value;
    if (m === '') {
      $('calculatedGrade').value = '';
      $('performanceStatus').value = '';
      return;
    }
    const g = calculateGrade(Number(m));
    $('calculatedGrade').value = g;
    $('performanceStatus').value = calculateStatus(g);
  }
  
  // ---------------- save result ----------------
  async function onSaveResult() {
    // ensure student verified
    if (!studentVerified) {
      return alert('Please search and verify the student exists in the student database before saving marks.');
    }
  
    // gather fields
    const student_id = $('studentID').value.trim();
    const student_name = $('studentName').value.trim();
    const form = $('form').value;
    const level = $('level').value;
    const subject = $('subject').value;
    const term = $('term').value;
    const year = $('year').value;
    const exam_type = $('examType').value || '';
    const exam_date = $('examDate').value || '';
    const marks = $('marks').value;
    const grade = $('calculatedGrade').value;
    const status = $('performanceStatus').value;
    const comment = $('comment').value;
  
    if (!student_id || !student_name || !form || !level || !subject || !term || !year || marks === '') {
      return alert('Please fill all required fields and ensure student is verified.');
    }
  
    const payload = {
      student_id,
      student_name,
      form,
      level,
      subject,
      term,
      year: Number(year),
      exam_type,
      exam_date,
      marks: Number(marks),
      grade,
      status,
      comment,
      teacher_id: '' // optional
    };
  
    try {
      const res = await fetch('/save_result', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      if (!res.ok) {
        return alert(j.message || 'Save failed');
      }
      alert('Saved successfully');
      clearForm();
      loadResults();
    } catch (err) {
      console.error(err);
      alert('Save error');
    }
  }
  
  // ---------------- load results ----------------
  async function loadResults() {
    const params = new URLSearchParams();
    const f = $('filterForm').value;
    const subj = $('filterSubject').value;
    const term = $('filterTerm').value;
    if (f) params.set('form', f);
    if (subj) params.set('subject', subj);
    if (term) params.set('term', term);
  
    try {
      const res = await fetch('/get_results?' + params.toString());
      const rows = await res.json();
      const tbody = document.querySelector('#resultsTable tbody');
      tbody.innerHTML = '';
      rows.forEach(r => {
        const tr = document.createElement('tr');
        const gradeClass = 'grade-' + (r.grade || 'E');
        const statusClass = (r.status && r.status.toLowerCase().includes('excellent')) ? 'status-excellent' :
                            (r.status && r.status.toLowerCase().includes('good')) ? 'status-good' :
                            (r.status && r.status.toLowerCase().includes('satisf')) ? 'status-average' :
                            (r.status && r.status.toLowerCase().includes('pass')) ? 'status-average' : 'status-fail';
        tr.innerHTML = `
          <td>${r.student_id}</td>
          <td>${r.student_name}</td>
          <td>${r.form}</td>
          <td>${r.subject}</td>
          <td>Term ${r.term} ${r.year}</td>
          <td>${r.marks}</td>
          <td><span class="grade-badge ${gradeClass}">${r.grade}</span></td>
          <td><span class="status-badge ${statusClass}">${r.status}</span></td>
          <td>${r.comment || ''}</td>
          <td>
            <button onclick="onEditResult(${r.id})">Edit</button>
            <button onclick="onDeleteResult(${r.id})" style="margin-left:6px;background:#dc3545;color:white;">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
  
      // update filterSubject options from loaded results if not present
      const filterSel = $('filterSubject');
      const existing = new Set(Array.from(filterSel.options).map(o=>o.value));
      rows.forEach(r => {
        if (r.subject && !existing.has(r.subject)) {
          const o = document.createElement('option'); o.value = r.subject; o.textContent = r.subject; filterSel.appendChild(o);
          existing.add(r.subject);
        }
      });
  
    } catch (err) {
      console.error(err);
      alert('Failed to load results');
    }
  }
  
  // ---------------- edit / delete ----------------
  async function onEditResult(id) {
    try {
      const res = await fetch('/get_results');
      const rows = await res.json();
      const r = rows.find(x => x.id === id);
      if (!r) return alert('Record not found');
  
      // populate form (and mark studentVerified true because student exists)
      $('studentID').value = r.student_id;
      $('studentName').value = r.student_name;
      $('form').value = r.form;
      $('level').value = r.level;
      $('subject').value = r.subject;
      $('term').value = r.term;
      $('year').value = r.year;
      $('examType').value = r.exam_type || '';
      $('examDate').value = r.exam_date || '';
      $('marks').value = r.marks;
      updateGradePreview();
      $('comment').value = r.comment || '';
      studentVerified = true;
      $('foundStudent').textContent = `${r.student_id} — ${r.student_name} (${r.form})`;
      window.scrollTo({top:200, behavior:'smooth'});
    } catch (err) {
      console.error(err);
      alert('Edit failed');
    }
  }
  
  async function onDeleteResult(id) {
    if (!confirm('Delete this result?')) return;
    try {
      const res = await fetch('/delete_result/' + id, { method: 'DELETE' });
      const j = await res.json();
      if (j.ok) { alert('Deleted'); loadResults(); }
      else alert('Delete failed');
    } catch (err) {
      console.error(err);
      alert('Delete error');
    }
  }
  
  // ---------------- clear ----------------
  function clearForm() {
    $('marks').value = '';
    $('calculatedGrade').value = '';
    $('performanceStatus').value = '';
    $('comment').value = '';
    // keep student visible; do not clear search by default
  }
  