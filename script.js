/* ==========================================================================
   PORTFOLIO INTERACTIVE JAVASCRIPT LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sticky Navigation & Header Scrolled State
  const header = document.querySelector('.header');
  const backToTopBtn = document.querySelector('.back-to-top');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    if (window.scrollY > 400) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }

    updateActiveNavLink();
  });

  // Back to top scroll handler
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 2. Mobile Menu Toggle
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const icon = mobileBtn.querySelector('i');
      if (icon) {
        if (navLinks.classList.contains('open')) {
          icon.className = 'fas fa-times';
        } else {
          icon.className = 'fas fa-bars';
        }
      }
    });

    // Close menu when clicking links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        const icon = mobileBtn.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
      });
    });
  }

  // 3. Active Nav Link on Scroll
  const sections = document.querySelectorAll('section[id]');
  function updateActiveNavLink() {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 100;
      const sectionId = current.getAttribute('id');
      const link = document.querySelector(`.nav-links a[href*="#${sectionId}"]`);
      if (link) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
    });
  }

  // 4. Skills Category Tabs & Progress Bar Animation
  const tabBtns = document.querySelectorAll('.skills-tabs .tab-btn');
  const skillCards = document.querySelectorAll('.skill-card');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const category = btn.getAttribute('data-tab');

      skillCards.forEach(card => {
        if (category === 'all' || card.getAttribute('data-category') === category) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Skill Bar Scroll Observer Trigger
  const skillBarFills = document.querySelectorAll('.skill-bar-fill');
  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const level = bar.getAttribute('data-level');
        bar.style.width = `${level}%`;
      }
    });
  }, { threshold: 0.2 });

  skillBarFills.forEach(bar => skillObserver.observe(bar));

  // 5. Projects Filter Logic
  const filterBtns = document.querySelectorAll('.project-filters .filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          card.style.animation = 'fadeIn 0.5s ease forward';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // 6. Project Modal Details Logic
  const modal = document.querySelector('.modal-backdrop');
  const modalCloseBtn = document.querySelector('.modal-close-btn');
  const modalTitle = document.querySelector('.modal-title');
  const modalBody = document.querySelector('.modal-description');
  const modalTags = document.querySelector('.modal-tags');
  const modalImg = document.querySelector('.modal-img');

  const projectDetailsMap = {
    'ai-analytics': {
      title: 'AI Analytics & Intelligence Dashboard',
      description: 'An enterprise real-time data analytics suite featuring predictive AI insights, dynamic chart visualization, and automated automated alert pipelines. Built with React, TypeScript, TailwindCSS, and Python FastAPI backend.',
      tags: ['React', 'TypeScript', 'FastAPI', 'Chart.js', 'TailwindCSS'],
      img: 'assets/project-ai.png'
    },
    'ecommerce': {
      title: 'NexStore - Premium E-Commerce Experience',
      description: 'Ultra-fast luxury e-commerce platform offering 3D product previews, instant checkout integrations, state-managed cart workflows, and tailored recommendations. Built with Next.js, Stripe, and Redux Toolkit.',
      tags: ['Next.js', 'Stripe API', 'Redux', 'Three.js', 'CSS Modules'],
      img: 'assets/project-ecommerce.png'
    },
    'saas-platform': {
      title: 'CloudSync - Collaborative SaaS Suite',
      description: 'A cloud team productivity workspace supporting real-time document editing, Kanban task boards, video conferencing, and automated webhooks. Built with WebSockets, Vue.js, Node.js, and MongoDB.',
      tags: ['Vue.js', 'Node.js', 'WebSockets', 'MongoDB', 'Docker'],
      img: 'assets/project-saas.png'
    }
  };

  document.querySelectorAll('.view-project-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const projectId = btn.getAttribute('data-project');
      const details = projectDetailsMap[projectId];

      if (details && modal) {
        if (modalTitle) modalTitle.textContent = details.title;
        if (modalBody) modalBody.textContent = details.description;
        if (modalImg) modalImg.src = details.img;

        if (modalTags) {
          modalTags.innerHTML = details.tags.map(t => `<span class="project-tag">${t}</span>`).join('');
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  function closeModal() {
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  }

  // 7. Contact Form Handling & Toast Notification
  const contactForm = document.querySelector('.contact-form');
  const toast = document.querySelector('.toast');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        contactForm.reset();

        showToast('Thank you! Your message has been sent successfully.');
      }, 1200);
    });
  }

  function showToast(message) {
    if (!toast) return;
    const toastMsg = toast.querySelector('.toast-message') || toast;
    toastMsg.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }
});
