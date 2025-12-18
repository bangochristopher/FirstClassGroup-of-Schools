import sqlite3
from flask import Flask, request, jsonify, send_from_directory
import os
from datetime import datetime, timedelta

app = Flask(__name__)

# ---------------------- DATABASE FILES ----------------------
DATABASE_STUDENTS = "database.db"
DATABASE_RESULTS = "results.db"
DATABASE_TEACHERS = "teachers.db"
DATABASE_ADMIN = "adminlogin.db"

# Server start time for uptime calculation
SERVER_START_TIME = datetime.now()


# ---------------------- INIT DB (STUDENTS, TEACHERS, RESULTS) ----------------------
def init_databases():
    # Students DB - Add password field
    conn = sqlite3.connect(DATABASE_STUDENTS)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE,
            name TEXT,
            surname TEXT,
            class TEXT,
            phone TEXT,
            attendance TEXT,
            age INTEGER,
            sex TEXT,
            password TEXT DEFAULT NULL,
            email TEXT,
            address TEXT,
            guardian_name TEXT,
            guardian_phone TEXT,
            date_of_birth TEXT,
            enrollment_date TEXT DEFAULT (date('now'))
        )
    """)
    conn.commit()
    conn.close()

    # Teachers DB
    conn = sqlite3.connect(DATABASE_TEACHERS)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id TEXT UNIQUE,
            name TEXT,
            surname TEXT,
            class TEXT,
            phone TEXT,
            password TEXT,
            role TEXT
        )
    """)
    conn.commit()
    conn.close()

    # Results DB
    conn = sqlite3.connect(DATABASE_RESULTS)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            student_name TEXT,
            form TEXT,
            level TEXT,
            subject TEXT,
            term TEXT,
            year INTEGER,
            exam_type TEXT,
            exam_date TEXT,
            marks INTEGER,
            grade TEXT,
            status TEXT,
            comment TEXT,
            teacher_id TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(student_id, subject, term, year, exam_type)
        )
    """)
    conn.commit()
    conn.close()


# ---------------------- ADMIN LOGIN DATABASE ----------------------
def init_admin_database():
    conn = sqlite3.connect(DATABASE_ADMIN)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id TEXT UNIQUE,
            name TEXT,
            role TEXT,
            password TEXT
        )
    """)

    # Default admins
    admins = [
        ("A001", "Mr. Banda", "superadmin", "admin123"),
        ("A002", "Mrs. Chikomo", "finance", "canteen321"),
        ("A003", "Mr. Dube", "registry", "register999")
    ]

    for admin in admins:
        try:
            c.execute("INSERT INTO admins (admin_id, name, role, password) VALUES (?, ?, ?, ?)", admin)
        except:
            pass

    conn.commit()
    conn.close()


# RUN INITIALIZERS
init_databases()
init_admin_database()


# ---------------------- SERVE INDEX.HTML ----------------------
@app.route("/")
def home():
    return send_from_directory(".", "index.html")


# ---------------------- STATISTICS API FOR INDEX PAGE ----------------------
@app.route("/api/statistics")
def get_statistics():
    """Get real-time statistics for the index page"""
    try:
        # Count students
        conn_students = sqlite3.connect(DATABASE_STUDENTS)
        c_students = conn_students.cursor()
        c_students.execute("SELECT COUNT(*) FROM students")
        student_count = c_students.fetchone()[0]
        conn_students.close()
        
        # Count teachers
        conn_teachers = sqlite3.connect(DATABASE_TEACHERS)
        c_teachers = conn_teachers.cursor()
        c_teachers.execute("SELECT COUNT(*) FROM teachers")
        teacher_count = c_teachers.fetchone()[0]
        conn_teachers.close()
        
        # Count unique subjects from results
        conn_results = sqlite3.connect(DATABASE_RESULTS)
        c_results = conn_results.cursor()
        c_results.execute("SELECT COUNT(DISTINCT subject) FROM results")
        subject_count = c_results.fetchone()[0]
        conn_results.close()
        
        # Calculate uptime
        uptime_delta = datetime.now() - SERVER_START_TIME
        uptime_hours = int(uptime_delta.total_seconds() / 3600)
        uptime_minutes = int((uptime_delta.total_seconds() % 3600) / 60)
        
        # Calculate uptime percentage (assume 99.9% for a well-running system)
        uptime_percent = "99.9%"
        uptime_hours_str = f"{uptime_hours}h {uptime_minutes}m"
        
        statistics = {
            "students": student_count,
            "teachers": teacher_count,
            "subjects": subject_count if subject_count > 0 else 15,  # Default to 15 if no results yet
            "uptime": uptime_percent,
            "uptime_hours": uptime_hours_str
        }
        
        return jsonify({
            "success": True,
            "statistics": statistics
        })
        
    except Exception as e:
        print(f"Error fetching statistics: {str(e)}")
        # Return fallback data
        return jsonify({
            "success": False,
            "statistics": {
                "students": 0,
                "teachers": 0,
                "subjects": 15,
                "uptime": "99.9%",
                "uptime_hours": "0h 0m"
            }
        })


# ============ ADMIN ROUTES ============

@app.route("/admin")
def admin_login_page():
    return send_from_directory("admin/adminlogin", "adminlogin.html")

@app.route("/admin/adminlogin.css")
def admin_login_css():
    return send_from_directory("admin/adminlogin", "adminlogin.css")

@app.route("/admin/adminlogin.js")
def admin_login_js():
    return send_from_directory("admin/adminlogin", "adminlogin.js")

@app.route("/admin/dashboard")
def admin_dashboard():
    return send_from_directory("admin/templates", "admin_dashboard.html")

@app.route("/admin/static/admin_dashboard.css")
def admin_dashboard_css():
    return send_from_directory("admin/static", "admin_dashboard.css")

@app.route("/admin/static/admin_dashboard.js")
def admin_dashboard_js():
    return send_from_directory("admin/static", "admin_dashboard.js")


# ---------------------- ADMIN LOGIN API ----------------------
@app.route("/admin_login", methods=["POST"])
def admin_login():
    data = request.json or {}
    admin_id = data.get("adminId")
    password = data.get("password")

    conn = sqlite3.connect(DATABASE_ADMIN)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT * FROM admins WHERE admin_id=?", (admin_id,))
    admin = c.fetchone()
    conn.close()

    if not admin:
        return jsonify({"success": False, "message": "Admin ID not found"})

    if admin["password"] != password:
        return jsonify({"success": False, "message": "Incorrect password"})

    return jsonify({
        "success": True,
        "redirect": "/admin/dashboard",
        "role": admin["role"],
        "name": admin["name"]
    })


# ---------------------- STUDENT CRUD ----------------------
@app.route("/add_student", methods=["POST"])
def add_student():
    data = request.json
    conn = sqlite3.connect(DATABASE_STUDENTS)
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO students (student_id, name, surname, class, phone, attendance, age, sex)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (data['sid'], data['name'], data['surname'], data['class'], 
              data['phone'], data['attendance'], data['age'], data['sex']))
        conn.commit()
        return jsonify({"success": True, "message": "Student added successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})
    finally:
        conn.close()


@app.route("/get_students", methods=["GET"])
def get_students():
    conn = sqlite3.connect(DATABASE_STUDENTS)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM students")
    students = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(students)


@app.route("/delete_student/<int:id>", methods=["DELETE"])
def delete_student(id):
    conn = sqlite3.connect(DATABASE_STUDENTS)
    c = conn.cursor()
    c.execute("DELETE FROM students WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Student deleted"})


# ---------------------- TEACHER CRUD ----------------------
@app.route("/add_teacher", methods=["POST"])
def add_teacher():
    data = request.json
    conn = sqlite3.connect(DATABASE_TEACHERS)
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO teachers (teacher_id, name, surname, class, phone, password, role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (data['teacher_id'], data['name'], data['surname'], data['class'], 
              data['phone'], data['password'], data['role']))
        conn.commit()
        return jsonify({"success": True, "message": "Teacher added successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})
    finally:
        conn.close()


@app.route("/get_teachers", methods=["GET"])
def get_teachers():
    conn = sqlite3.connect(DATABASE_TEACHERS)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM teachers")
    teachers = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(teachers)


@app.route("/delete_teacher/<int:id>", methods=["DELETE"])
def delete_teacher(id):
    conn = sqlite3.connect(DATABASE_TEACHERS)
    c = conn.cursor()
    c.execute("DELETE FROM teachers WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Teacher deleted"})


# ============ TEACHER ROUTES ============

@app.route("/teacher")
def teacher_login_page():
    return send_from_directory("teacher/teacherlogin", "teacherlogin.html")

@app.route("/teacher/teacherlog.css")
def teacher_login_css():
    return send_from_directory("teacher/teacherlogin", "teacherlog.css")

@app.route("/teacher/teacherlog.js")
def teacher_login_js():
    return send_from_directory("teacher/teacherlogin", "teacherlog.js")

@app.route("/teacher/teacher_dashboard.html")
def teacher_dashboard():
    return send_from_directory("teacher", "teacher_dashboard.html")

@app.route("/teacher/teacher_dashboard.css")
def teacher_dashboard_css():
    return send_from_directory("teacher", "teacher_dashboard.css")

@app.route("/teacher/teacher_dashboard.js")
def teacher_dashboard_js():
    return send_from_directory("teacher", "teacher_dashboard.js")


# ---------------------- TEACHER LOGIN API ----------------------
@app.route("/teacher_login", methods=["POST"])
def teacher_login():
    data = request.json or {}
    teacher_id = data.get("teacherId")
    password = data.get("password")
    
    print("=" * 50)
    print("TEACHER LOGIN ATTEMPT:")
    print(f"Received Teacher ID: '{teacher_id}'")
    print(f"Received Password: '{password}'")
    print("=" * 50)

    if not teacher_id or not password:
        return jsonify({"success": False, "message": "Please provide Teacher ID and password"})

    conn = sqlite3.connect(DATABASE_TEACHERS)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM teachers WHERE teacher_id=?", (teacher_id,))
    teacher = c.fetchone()
    
    print(f"Database search result: {teacher}")
    print("=" * 50)
    
    conn.close()

    if not teacher:
        return jsonify({"success": False, "message": "Teacher ID not found"})

    if teacher["password"] != password:
        return jsonify({"success": False, "message": "Incorrect password"})

    return jsonify({
        "success": True,
        "redirect": "/teacher/teacher_dashboard.html",
        "name": teacher["name"],
        "role": teacher["role"] if teacher["role"] else ""
    })


# ---------------------- STUDENT SEARCH (for teacher dashboard) ----------------------
@app.route("/search_student", methods=["POST"])
def search_student():
    data = request.json or {}
    student_id = data.get("student_id", "").strip()
    name = data.get("name", "").strip()
    
    if not student_id and not name:
        return jsonify({"found": False, "message": "Please provide student ID or name"}), 400
    
    conn = sqlite3.connect(DATABASE_STUDENTS)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    if student_id:
        c.execute("SELECT * FROM students WHERE student_id=?", (student_id,))
    else:
        c.execute("SELECT * FROM students WHERE name LIKE ?", (f"%{name}%",))
    
    student = c.fetchone()
    conn.close()
    
    if not student:
        return jsonify({"found": False, "message": "Student not found"}), 404
    
    return jsonify({
        "found": True,
        "student": dict(student)
    })


# ---------------------- RESULTS CRUD ----------------------
@app.route("/save_result", methods=["POST"])
def save_result():
    data = request.json
    required = ["student_id", "student_name", "form", "level", "subject", "term", "year", "marks", "grade", "status"]
    
    for field in required:
        if field not in data:
            return jsonify({"success": False, "message": f"Missing field: {field}"}), 400
    
    conn = sqlite3.connect(DATABASE_RESULTS)
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT OR REPLACE INTO results 
            (student_id, student_name, form, level, subject, term, year, exam_type, exam_date, marks, grade, status, comment, teacher_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["student_id"], data["student_name"], data["form"], data["level"],
            data["subject"], data["term"], data["year"], data.get("exam_type", ""),
            data.get("exam_date", ""), data["marks"], data["grade"], data["status"],
            data.get("comment", ""), data.get("teacher_id", "")
        ))
        conn.commit()
        return jsonify({"success": True, "message": "Result saved successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@app.route("/get_results", methods=["GET"])
def get_results():
    form = request.args.get("form", "")
    subject = request.args.get("subject", "")
    term = request.args.get("term", "")
    
    conn = sqlite3.connect(DATABASE_RESULTS)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    query = "SELECT * FROM results WHERE 1=1"
    params = []
    
    if form:
        query += " AND form=?"
        params.append(form)
    if subject:
        query += " AND subject=?"
        params.append(subject)
    if term:
        query += " AND term=?"
        params.append(term)
    
    query += " ORDER BY created_at DESC"
    
    c.execute(query, params)
    results = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return jsonify(results)


@app.route("/delete_result/<int:id>", methods=["DELETE"])
def delete_result(id):
    conn = sqlite3.connect(DATABASE_RESULTS)
    c = conn.cursor()
    c.execute("DELETE FROM results WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "message": "Result deleted"})


# ============ STUDENT ROUTES ============

@app.route("/student")
def student_login_page():
    return send_from_directory("student", "studentlog.html")

@app.route("/student/studentlog.css")
def student_login_css():
    return send_from_directory("student", "studentlog.css")

@app.route("/student/studentlog.js")
def student_login_js():
    return send_from_directory("student", "studentlog.js")

@app.route("/student/student_dashboard.html")
def student_dashboard():
    return send_from_directory("student", "student_dashboard.html")

# Optional: Catch-all route for any other student files
@app.route("/student/<path:filename>")
def serve_student_files(filename):
    return send_from_directory("student", filename)


# ---------------------- STUDENT LOGIN/REGISTRATION API ----------------------

@app.route("/verify_student", methods=["POST"])
def verify_student():
    """Verify if student exists in database and check if they have a password"""
    try:
        data = request.json or {}
        student_id = data.get("studentId", "").strip()
        
        print("=" * 50)
        print("STUDENT VERIFICATION:")
        print(f"Student ID received: '{student_id}'")
        
        if not student_id:
            return jsonify({
                "valid": False, 
                "message": "Please provide Student ID"
            }), 400
        
        conn = sqlite3.connect(DATABASE_STUDENTS)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # Search for student - try exact match first
        c.execute("SELECT * FROM students WHERE student_id=?", (student_id,))
        student = c.fetchone()
        
        # If not found, try case-insensitive search
        if not student:
            c.execute("SELECT * FROM students WHERE LOWER(student_id)=LOWER(?)", (student_id,))
            student = c.fetchone()
        
        conn.close()
        
        if not student:
            print(f"❌ Student not found in database")
            print("=" * 50)
            return jsonify({
                "valid": False, 
                "message": f"Student ID '{student_id}' not found in database. Please check your ID or contact administration."
            }), 404
        
        # Safely extract student data with fallbacks
        student_dict = dict(student)
        
        # Build name safely
        name = student_dict.get('name', '')
        surname = student_dict.get('surname', '')
        full_name = f"{name} {surname}".strip() if surname else name
        
        # Build student info object
        student_info = {
            "id": student_dict.get("student_id", student_id),
            "name": full_name or "Student",
            "class": student_dict.get("class") or "Not Assigned",
            "email": student_dict.get("email") or f"{student_id}@school.edu"
        }
        
        has_password = bool(student_dict.get("password"))
        
        print(f"✅ Student found: {student_info['name']}")
        print(f"Has password: {has_password}")
        print("=" * 50)
        
        return jsonify({
            "valid": True,
            "hasPassword": has_password,
            "student": student_info
        })
        
    except Exception as e:
        print(f"❌ ERROR in verify_student: {str(e)}")
        import traceback
        traceback.print_exc()
        print("=" * 50)
        return jsonify({
            "valid": False,
            "message": f"Server error: {str(e)}"
        }), 500


@app.route("/create_student_password", methods=["POST"])
def create_student_password():
    """Create password for first-time student login"""
    try:
        data = request.json or {}
        student_id = data.get("studentId", "").strip()
        password = data.get("password", "")
        
        print("=" * 50)
        print("CREATE PASSWORD REQUEST:")
        print(f"Student ID: '{student_id}'")
        print(f"Password length: {len(password)}")
        
        if not student_id:
            print("❌ Missing student ID")
            print("=" * 50)
            return jsonify({
                "success": False, 
                "message": "Student ID is required"
            }), 400
        
        if not password:
            print("❌ Missing password")
            print("=" * 50)
            return jsonify({
                "success": False, 
                "message": "Password is required"
            }), 400
        
        if len(password) < 8:
            print("❌ Password too short")
            print("=" * 50)
            return jsonify({
                "success": False, 
                "message": "Password must be at least 8 characters"
            }), 400
        
        conn = sqlite3.connect(DATABASE_STUDENTS)
        c = conn.cursor()
        
        # First check if student exists
        c.execute("SELECT student_id FROM students WHERE student_id=?", (student_id,))
        student = c.fetchone()
        
        if not student:
            conn.close()
            print(f"❌ Student '{student_id}' not found")
            print("=" * 50)
            return jsonify({
                "success": False, 
                "message": "Student not found"
            }), 404
        
        # Update password
        c.execute("UPDATE students SET password=? WHERE student_id=?", (password, student_id))
        rows_affected = c.rowcount
        conn.commit()
        conn.close()
        
        if rows_affected == 0:
            print(f"❌ No rows updated for student '{student_id}'")
            print("=" * 50)
            return jsonify({
                "success": False, 
                "message": "Failed to update password"
            }), 500
        
        print(f"✅ Password created successfully for student '{student_id}'")
        print("=" * 50)
        
        return jsonify({
            "success": True, 
            "message": "Password created successfully"
        })
        
    except Exception as e:
        print(f"❌ ERROR in create_student_password: {str(e)}")
        import traceback
        traceback.print_exc()
        print("=" * 50)
        return jsonify({
            "success": False, 
            "message": f"Server error: {str(e)}"
        }), 500


@app.route("/student_login", methods=["POST"])
def student_login():
    """Student login endpoint"""
    try:
        data = request.json or {}
        student_id = data.get("studentId", "").strip()
        password = data.get("password", "")
        
        print("=" * 50)
        print("STUDENT LOGIN ATTEMPT:")
        print(f"Student ID: '{student_id}'")
        
        if not student_id or not password:
            print("❌ Missing credentials")
            print("=" * 50)
            return jsonify({
                "success": False, 
                "message": "Student ID and password required"
            }), 400
        
        conn = sqlite3.connect(DATABASE_STUDENTS)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM students WHERE student_id=?", (student_id,))
        student = c.fetchone()
        conn.close()
        
        if not student:
            print(f"❌ Student '{student_id}' not found")
            print("=" * 50)
            return jsonify({
                "success": False, 
                "message": "Student ID not found"
            }), 404
        
        student_dict = dict(student)
        stored_password = student_dict.get("password")
        
        if not stored_password:
            print("❌ No password set for this student")
            print("=" * 50)
            return jsonify({
                "success": False, 
                "message": "Please set up your password first"
            }), 400
        
        if stored_password != password:
            print("❌ Incorrect password")
            print("=" * 50)
            return jsonify({
                "success": False, 
                "message": "Incorrect password"
            }), 401
        
        # Build student info for response
        name = student_dict.get('name', '')
        surname = student_dict.get('surname', '')
        full_name = f"{name} {surname}".strip() if surname else name
        
        print(f"✅ Login successful for '{student_id}'")
        print("=" * 50)
        
        return jsonify({
            "success": True,
            "redirect": f"/student/student_dashboard.html?studentId={student_id}",
            "student": {
                "id": student_dict.get("student_id"),
                "name": full_name or "Student",
                "class": student_dict.get("class") or "Not Assigned"
            }
        })
        
    except Exception as e:
        print(f"❌ ERROR in student_login: {str(e)}")
        import traceback
        traceback.print_exc()
        print("=" * 50)
        return jsonify({
            "success": False, 
            "message": f"Server error: {str(e)}"
        }), 500


@app.route("/student_results/<student_id>", methods=["GET"])
def get_student_results(student_id):
    """Get all results for a specific student"""
    try:
        print("=" * 50)
        print(f"FETCHING RESULTS for student: '{student_id}'")
        
        conn = sqlite3.connect(DATABASE_RESULTS)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        c.execute("""
            SELECT * FROM results 
            WHERE student_id=? 
            ORDER BY year DESC, term DESC, created_at DESC
        """, (student_id,))
        
        results = [dict(row) for row in c.fetchall()]
        conn.close()
        
        print(f"Found {len(results)} results")
        
        # Calculate statistics
        if results:
            total_marks = sum(r["marks"] for r in results if r["marks"] is not None)
            average = total_marks / len(results) if results else 0
            
            valid_results = [r for r in results if r["marks"] is not None]
            if valid_results:
                best_subject = max(valid_results, key=lambda x: x["marks"])
                weak_subject = min(valid_results, key=lambda x: x["marks"])
            else:
                best_subject = {"subject": "N/A", "marks": 0}
                weak_subject = {"subject": "N/A", "marks": 0}
            
            passed = sum(1 for r in results if r.get("status") == "Pass")
            failed = len(results) - passed
            
            statistics = {
                "totalSubjects": len(results),
                "average": round(average, 2),
                "bestSubject": best_subject["subject"],
                "bestScore": best_subject["marks"],
                "weakestSubject": weak_subject["subject"],
                "weakestScore": weak_subject["marks"],
                "passed": passed,
                "failed": failed
            }
        else:
            statistics = {
                "totalSubjects": 0,
                "average": 0,
                "bestSubject": "N/A",
                "bestScore": 0,
                "weakestSubject": "N/A",
                "weakestScore": 0,
                "passed": 0,
                "failed": 0
            }
        
        print(f"✅ Results fetched successfully")
        print("=" * 50)
        
        return jsonify({
            "results": results,
            "statistics": statistics
        })
        
    except Exception as e:
        print(f"❌ ERROR in get_student_results: {str(e)}")
        import traceback
        traceback.print_exc()
        print("=" * 50)
        return jsonify({
            "results": [],
            "statistics": {},
            "error": str(e)
        }), 500


# ---------------------- DEBUG ROUTES ----------------------
@app.route("/debug/students")
def debug_students():
    try:
        conn = sqlite3.connect(DATABASE_STUDENTS)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM students")
        students = [dict(row) for row in c.fetchall()]
        conn.close()
        return jsonify({"success": True, "count": len(students), "data": students})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@app.route("/debug/teachers")
def debug_teachers():
    try:
        conn = sqlite3.connect(DATABASE_TEACHERS)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM teachers")
        teachers = [dict(row) for row in c.fetchall()]
        conn.close()
        return jsonify({"success": True, "count": len(teachers), "data": teachers})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@app.route("/debug/results")
def debug_results():
    try:
        conn = sqlite3.connect(DATABASE_RESULTS)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM results")
        results = [dict(row) for row in c.fetchall()]
        conn.close()
        return jsonify({"success": True, "count": len(results), "data": results})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


# ==================== FLASK APP RUNNER ====================
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)