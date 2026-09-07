document.addEventListener('DOMContentLoaded', () => {
  // ---------- Loading animation on form submit ----------
  ['registerForm', 'loginForm'].forEach((formId) => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', () => {
      if (!form.checkValidity()) return; // let native validation messages show first
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.classList.add('is-loading');
        btn.disabled = true;
      }
    });
  });

  // ---------- Live password match hint (register page) ----------
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirmPassword');
  const matchHint = document.getElementById('matchHint');

  if (password && confirmPassword && matchHint) {
    const checkMatch = () => {
      if (!confirmPassword.value) {
        matchHint.textContent = '\u00A0';
        matchHint.classList.remove('hint-success', 'hint-error');
        return;
      }
      if (password.value === confirmPassword.value) {
        matchHint.textContent = 'Passwords match';
        matchHint.classList.add('hint-success');
        matchHint.classList.remove('hint-error');
      } else {
        matchHint.textContent = 'Passwords do not match';
        matchHint.classList.add('hint-error');
        matchHint.classList.remove('hint-success');
      }
    };
    confirmPassword.addEventListener('input', checkMatch);
    password.addEventListener('input', checkMatch);
  }
});
