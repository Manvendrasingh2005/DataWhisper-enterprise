# Contributing to DataWhisper Enterprise

Thank you for your interest in contributing to DataWhisper! We welcome contributions, bug reports, feature requests, and pull requests.

---

## 🛠️ Development Workflow

1. **Fork the Repository** and clone your fork locally.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. **Set Up Development Environment**:
   - Follow the setup steps in [README.md](README.md) for both Backend (Django) and Frontend (Vite/React).
4. **Make Your Changes**:
   - Write clean, maintainable code following existing patterns.
   - For backend changes, ensure all tests pass: `python manage.py test api`.
   - For frontend changes, ensure lint checks pass: `npm run lint`.
5. **Commit Conventions**:
   Use structured commit messages:
   - `feat(...)`: New feature or capability
   - `fix(...)`: Bug fix
   - `docs(...)`: Documentation updates
   - `style(...)`: Formatting or CSS adjustments
   - `refactor(...)`: Code refactoring without behavior change
   - `test(...)`: Adding or updating tests
6. **Submit a Pull Request**:
   - Describe what changed and provide instructions for testing.

---

## 🔒 Security Vulnerability Reporting

If you discover a security vulnerability within DataWhisper, please send an email to the repository owner rather than opening a public issue. We take security seriously and will address the issue promptly.
