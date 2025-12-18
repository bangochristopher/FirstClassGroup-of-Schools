// ---------------------------------------------
// API Helper with FIXED error handling
// ---------------------------------------------
async function api(url, data) {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
        });
        
        // Parse JSON once
        const jsonData = await res.json();
        
        if (!res.ok) {
            console.error("API Error:", res.status, jsonData);
        }
        
        return jsonData;
    } catch (error) {
        console.error("Network Error:", error);
        return {
            success: false,
            valid: false,
            message: "Network error. Please check your connection and try again."
        };
    }
}

// ---------------------------------------------
// Helper: Switch Steps
// ---------------------------------------------
function showStep(stepNumber) {
    document.querySelectorAll(".form-step").forEach(step => {
        step.classList.remove("active");
    });

    document.querySelector(`#step${stepNumber}-form`).classList.add("active");

    // Update step indicator
    document.querySelectorAll(".step").forEach(step => {
        step.classList.remove("active");
        if (step.dataset.step === String(stepNumber)) {
            step.classList.add("active");
        }
    });
}

// ---------------------------------------------
// STEP 1 – VERIFY STUDENT ID
// ---------------------------------------------
const step1Form = document.getElementById("step1-form");
step1Form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const studentId = document.getElementById("studentId").value.trim();
    const errorBox = document.getElementById("studentId-error");
    const loader = document.getElementById("step1-loading");

    if (!studentId) {
        errorBox.textContent = "Please enter your Student ID";
        errorBox.style.display = "block";
        return;
    }

    errorBox.textContent = "";
    errorBox.style.display = "none";
    loader.classList.add("active");

    console.log("Verifying student ID:", studentId);

    const result = await api("/verify_student", { studentId });

    loader.classList.remove("active");

    console.log("Verification result:", result);

    if (!result.valid) {
        errorBox.textContent = result.message || "Student ID not found";
        errorBox.style.display = "block";
        return;
    }

    // Store student info globally
    window.studentData = result.student;

    // Student has a password already → skip to login
    if (result.hasPassword) {
        document.getElementById("loginStudentInfo").innerHTML =
            `<p><strong>Name:</strong> ${result.student.name}</p>
             <p><strong>ID:</strong> ${result.student.id}</p>
             <p><strong>Class:</strong> ${result.student.class}</p>`;
        showStep(3);
        return;
    }

    // Fill student info for password creation
    document.getElementById("studentInfo").innerHTML =
        `<p><strong>Name:</strong> ${result.student.name}</p>
         <p><strong>Class:</strong> ${result.student.class}</p>
         <p><strong>Email:</strong> ${result.student.email}</p>`;

    showStep(2);
});

// ---------------------------------------------
// STEP 2 – PASSWORD CREATION
// ---------------------------------------------
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const createPasswordBtn = document.getElementById("createPasswordBtn");

// Password strength hints
const hintLength = document.getElementById("hint-length");
const hintUpper = document.getElementById("hint-uppercase");
const hintLower = document.getElementById("hint-lowercase");
const hintNumber = document.getElementById("hint-number");
const hintSpecial = document.getElementById("hint-special");

const strengthBar = document.getElementById("passwordStrength");

function validatePassword() {
    const pass = newPassword.value;

    const rules = {
        length: pass.length >= 8,
        upper: /[A-Z]/.test(pass),
        lower: /[a-z]/.test(pass),
        number: /\d/.test(pass),
        special: /[^A-Za-z0-9]/.test(pass)
    };

    // Update hints visually
    hintLength.classList.toggle("valid", rules.length);
    hintUpper.classList.toggle("valid", rules.upper);
    hintLower.classList.toggle("valid", rules.lower);
    hintNumber.classList.toggle("valid", rules.number);
    hintSpecial.classList.toggle("valid", rules.special);

    // Password strength bar
    const score = Object.values(rules).filter(Boolean).length;
    
    strengthBar.classList.remove("weak", "medium", "strong");
    if (score >= 4) {
        strengthBar.classList.add("strong");
    } else if (score >= 3) {
        strengthBar.classList.add("medium");
    } else if (score >= 1) {
        strengthBar.classList.add("weak");
    }

    // Enable button if all valid and passwords match
    const allValid = score === 5;
    const passwordsMatch = confirmPassword.value && confirmPassword.value === pass;
    createPasswordBtn.disabled = !(allValid && passwordsMatch);
}

newPassword.addEventListener("input", validatePassword);
confirmPassword.addEventListener("input", validatePassword);

// Submit to API
document.getElementById("step2-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const errorBox = document.getElementById("passwordMatch-error");
    const loader = document.getElementById("step2-loading");

    if (newPassword.value !== confirmPassword.value) {
        errorBox.textContent = "Passwords do not match.";
        errorBox.style.display = "block";
        return;
    }

    errorBox.textContent = "";
    errorBox.style.display = "none";
    loader.classList.add("active");

    const response = await api("/create_student_password", {
        studentId: window.studentData.id,
        password: newPassword.value
    });

    loader.classList.remove("active");

    if (!response.success) {
        errorBox.textContent = response.message || "Failed to create password";
        errorBox.style.display = "block";
        return;
    }

    // Move to login
    document.getElementById("loginStudentInfo").innerHTML =
        `<p><strong>Name:</strong> ${window.studentData.name}</p>
         <p><strong>ID:</strong> ${window.studentData.id}</p>
         <p><strong>Class:</strong> ${window.studentData.class}</p>`;

    // Show success message
    document.getElementById("step3-success").style.display = "block";

    showStep(3);
});

// Back button → Step 1
document.getElementById("backToStep1").addEventListener("click", () => {
    showStep(1);
});

// ---------------------------------------------
// STEP 3 – LOGIN
// ---------------------------------------------
document.getElementById("step3-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const loginPassword = document.getElementById("loginPassword").value;
    const errorBox = document.getElementById("login-error");
    const loader = document.getElementById("step3-loading");

    if (!loginPassword) {
        errorBox.textContent = "Please enter your password";
        errorBox.style.display = "block";
        return;
    }

    errorBox.textContent = "";
    errorBox.style.display = "none";
    loader.classList.add("active");

    const response = await api("/student_login", {
        studentId: window.studentData.id,
        password: loginPassword
    });

    loader.classList.remove("active");

    if (!response.success) {
        errorBox.textContent = response.message || "Login failed";
        errorBox.style.display = "block";
        return;
    }

    // Success → Redirect to dashboard
    alert("Login successful! Redirecting to dashboard...");
    window.location.href = response.redirect || "/student/student_dashboard.html?studentId=" + window.studentData.id;
});

// Back button → Step 2 (only if they just created password)
document.getElementById("backToStep2").addEventListener("click", () => {
    showStep(2);
});

// ---------------------------------------------
// Toggle password visibility
// ---------------------------------------------
document.querySelectorAll(".toggle-password").forEach(btn => {
    btn.addEventListener("click", () => {
        const input = btn.parentElement.querySelector("input");
        const icon = btn.querySelector("i");

        if (input.type === "password") {
            input.type = "text";
            icon.classList.replace("fa-eye", "fa-eye-slash");
        } else {
            input.type = "password";
            icon.classList.replace("fa-eye-slash", "fa-eye");
        }
    });
});

// Forgot password handler
document.getElementById("forgotPassword").addEventListener("click", (e) => {
    e.preventDefault();
    alert("Please contact your administrator at support@school.edu to reset your password.");
});