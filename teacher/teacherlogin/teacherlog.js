// Teacher Login JavaScript
class TeacherLogin {
    constructor() {
        this.form = document.getElementById('teacherLoginForm');
        this.loading = document.getElementById('loading');
        this.errorBox = document.getElementById('error');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.focusOnTeacherId();
    }
    
    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Password visibility toggle
        const toggleBtn = document.querySelector('.toggle-password');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                const container = e.target.closest('.password-container');
                const input = container.querySelector('input');
                const icon = e.target.tagName === 'I' ? e.target : e.target.querySelector('i');
                this.togglePasswordVisibility(input, icon);
            });
        }
        
        // Forgot password
        const forgotLink = document.getElementById('forgotPassword');
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();

        const teacherId = document.getElementById('teacherId').value.trim();
        const password = document.getElementById('password').value.trim();
        const rememberMe = document.getElementById('rememberMe').checked;

        this.clearError();

        if (!teacherId || !password) {
            this.showError('Please enter both Teacher ID and password');
            return;
        }

        this.loading.classList.add('active');
        this.loading.style.display = 'block';

        try {
            // Call Flask API
            const response = await fetch('/teacher_login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    teacherId: teacherId, 
                    password: password 
                })
            });

            const result = await response.json();

            if (!result.success) {
                this.showError(result.message || 'Login failed');
                this.loading.style.display = 'none';
                return;
            }

            // Store remember me preference
            if (rememberMe) {
                localStorage.setItem('teacherRememberMe', 'true');
                localStorage.setItem('teacherId', teacherId);
            }

            // SUCCESS - Redirect to dashboard
            alert('Login successful! Redirecting to dashboard...');
            window.location.href = result.redirect;

        } catch (error) {
            console.error('Login error:', error);
            this.showError('Server error. Please try again.');
        } finally {
            this.loading.classList.remove('active');
            this.loading.style.display = 'none';
        }
    }
    
    togglePasswordVisibility(input, icon) {
        if (input.type === "password") {
            input.type = "text";
            icon.className = "fas fa-eye-slash";
        } else {
            input.type = "password";
            icon.className = "fas fa-eye";
        }
    }
    
    handleForgotPassword() {
        const teacherId = document.getElementById('teacherId').value;
        if (!teacherId) {
            alert('Please enter your Teacher ID first');
            return;
        }
        alert('Password reset functionality coming soon. Please contact IT Support.');
    }
    
    showError(message) {
        this.errorBox.textContent = message;
        this.errorBox.style.display = 'block';
        this.errorBox.className = 'message error';
    }
    
    clearError() {
        this.errorBox.textContent = '';
        this.errorBox.style.display = 'none';
    }
    
    focusOnTeacherId() {
        const teacherIdInput = document.getElementById('teacherId');
        const passwordInput = document.getElementById('password');
        
        if (localStorage.getItem('teacherRememberMe') === 'true') {
            const savedTeacherId = localStorage.getItem('teacherId');
            if (savedTeacherId) {
                teacherIdInput.value = savedTeacherId;
                passwordInput.focus();
                return;
            }
        }
        teacherIdInput.focus();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TeacherLogin();
});