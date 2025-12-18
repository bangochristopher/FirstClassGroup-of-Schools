class AdminLogin {
    constructor() {
        this.form = document.getElementById("adminLoginForm");
        this.errorBox = document.getElementById("error");
        this.loading = document.getElementById("loading");

        this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    showError(msg) {
        this.errorBox.textContent = msg;
        this.errorBox.style.display = "block";
    }

    clearError() {
        this.errorBox.style.display = "none";
    }

    async handleSubmit(e) {
        e.preventDefault();

        const adminId = document.getElementById("adminId").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!adminId || !password) {
            this.showError("Enter Admin ID and Password");
            return;
        }

        this.loading.style.display = "block";
        this.clearError();

        try {
            const response = await fetch("/admin_login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adminId: adminId,
                    password: password
                })
            });

            const result = await response.json();

            if (!result.success) {
                this.showError(result.message);
                this.loading.style.display = "none";
                return;
            }

            // SUCCESS → Redirect
            window.location.href = result.redirect;

        } catch (err) {
            this.showError("Server error. Try again.");
        } finally {
            this.loading.style.display = "none";
        }
    }
}

new AdminLogin();
