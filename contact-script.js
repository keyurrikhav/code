/**
 * ApexHR - Contact Page Form Handling
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const successBox = document.getElementById('contact-success');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const messageInput = document.getElementById('contact-message');
    const submitBtn = document.getElementById('contact-submit-btn');

    // Basic required-field check
    if (!nameInput.value.trim() || !emailInput.value.trim() || !messageInput.value.trim()) {
      [nameInput, emailInput, messageInput].forEach(field => {
        if (!field.value.trim()) {
          field.style.borderColor = '#f43f5e';
        }
      });
      return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Sending...</span>';

    // Simulate a network request
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      form.reset();

      if (successBox) {
        successBox.classList.add('show');
        setTimeout(() => successBox.classList.remove('show'), 5000);
      }
    }, 1000);
  });

  // Clear red border once user starts typing again
  ['contact-name', 'contact-email', 'contact-message'].forEach(id => {
    const field = document.getElementById(id);
    if (field) {
      field.addEventListener('input', () => {
        field.style.borderColor = '';
      });
    }
  });
});
