/* Show a section */
function showSection(id) {
    document.querySelectorAll(".section").forEach(sec => sec.style.display = "none");
    document.getElementById(id).style.display = "block";
}

/* Save student */
function saveStudent() {
    let student = {
        sid: document.getElementById("sid").value,
        name: document.getElementById("name").value,
        surname: document.getElementById("surname").value,
        class: document.getElementById("class").value,
        phone: document.getElementById("phone").value,
        attendance: document.getElementById("attendance").value,
        age: document.getElementById("age").value,
        sex: document.getElementById("sex").value
    };

    fetch("/add_student", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(student)
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        loadStudents();
        // Clear form
        document.getElementById("sid").value = "";
        document.getElementById("name").value = "";
        document.getElementById("surname").value = "";
        document.getElementById("class").value = "";
        document.getElementById("phone").value = "";
        document.getElementById("attendance").value = "";
        document.getElementById("age").value = "";
        document.getElementById("sex").value = "";
    });
}

/* Save teacher */
function saveTeacher() {
    let teacher = {
        teacher_id: document.getElementById("tid").value,
        name: document.getElementById("tname").value,
        surname: document.getElementById("tsurname").value,
        class: document.getElementById("tclass").value,
        phone: document.getElementById("tphone").value,
        password: document.getElementById("tpass").value,
        role: document.getElementById("trole").value
    };

    fetch("/add_teacher", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(teacher)
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        loadTeachers();
        // Clear form
        document.getElementById("tid").value = "";
        document.getElementById("tname").value = "";
        document.getElementById("tsurname").value = "";
        document.getElementById("tclass").value = "";
        document.getElementById("tphone").value = "";
        document.getElementById("tpass").value = "";
        document.getElementById("trole").value = "";
    });
}

/* Load students */
function loadStudents() {
    fetch("/get_students")
    .then(res => res.json())
    .then(students => {
        let table = document.getElementById("studentTable");
        table.innerHTML = "";

        students.forEach(s => {
            table.innerHTML += `
                <tr>
                    <td>${s.student_id || s.sid}</td>
                    <td>${s.name}</td>
                    <td>${s.surname}</td>
                    <td>${s.class}</td>
                    <td>${s.phone}</td>
                    <td>${s.attendance}</td>
                    <td>${s.age}</td>
                    <td>${s.sex}</td>
                    <td><button class="delete-btn" onclick="deleteStudent(${s.id})">Delete</button></td>
                </tr>`;
        });
    })
    .catch(err => {
        console.error("Error loading students:", err);
    });
}

/* Load teachers */
function loadTeachers() {
    fetch("/get_teachers")
    .then(res => res.json())
    .then(teachers => {
        let table = document.getElementById("teacherTable");
        table.innerHTML = "";

        teachers.forEach(t => {
            table.innerHTML += `
                <tr>
                    <td>${t.teacher_id}</td>
                    <td>${t.name}</td>
                    <td>${t.surname}</td>
                    <td>${t.class}</td>
                    <td>${t.phone}</td>
                    <td>${t.password}</td>
                    <td>${t.role}</td>
                    <td><button class="delete-btn" onclick="deleteTeacher(${t.id})">Delete</button></td>
                </tr>`;
        });
    })
    .catch(err => {
        console.error("Error loading teachers:", err);
    });
}

/* Delete student */
function deleteStudent(id) {
    if (!confirm("Are you sure you want to delete this student?")) {
        return;
    }
    
    fetch("/delete_student/" + id, { method: "DELETE" })
    .then(r => r.json())
    .then(data => {
        alert(data.message);
        loadStudents();
    });
}

/* Delete teacher */
function deleteTeacher(id) {
    if (!confirm("Are you sure you want to delete this teacher?")) {
        return;
    }
    
    fetch("/delete_teacher/" + id, { method: "DELETE" })
    .then(r => r.json())
    .then(data => {
        alert(data.message);
        loadTeachers();
    });
}

// Auto-load lists on page load
window.addEventListener('DOMContentLoaded', function() {
    loadStudents();
    loadTeachers();
});