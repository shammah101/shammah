window.UIModule = (() => {
    const SECTION_IDS = [
        'projects-section',
        'news-section',
        'about-section',
        'people-section',
        'careers-section',
        'contact-section'
    ];

    function closeDropdownMenu() {
        const menu = document.getElementById('dropdown-menu');
        const logoArea = document.getElementById('logo-click-area');

        if (menu) menu.classList.remove('show');
        if (logoArea) logoArea.classList.remove('active');
    }

    function showSectionInternal(sectionId) {
        SECTION_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = (id === `${sectionId}-section`) ? 'block' : 'none';
            }
        });

        closeDropdownMenu();

        if (sectionId === 'people') {
            PeopleModule.restoreLockedPersonViewer();
        }

        document.body.classList.toggle('section-projects-view', sectionId !== 'projects');
    }

    function bindDropdownItems() {
        const menu = document.getElementById('dropdown-menu');
        if (!menu) return;

        menu.addEventListener('click', event => {
            const item = event.target.closest('[data-section-target]');
            if (!item) return;

            const sectionId = item.dataset.sectionTarget;
            if (!sectionId) return;

            showSectionInternal(sectionId);
        });
    }

    function bindHeaderNav() {
        const nav = document.querySelector('.nav-container');
        if (!nav) return;

        nav.addEventListener('click', event => {
            const link = event.target.closest('[data-project-nav]');
            if (!link) return;

            event.preventDefault();

            const category = link.dataset.projectNav || 'all';
            showSectionInternal('projects');
            filterProjects(category);
        });
    }

    function bindContactAccordion() {
        const contactSection = document.getElementById('contact-section');
        if (!contactSection) return;

        contactSection.addEventListener('click', event => {
            const header = event.target.closest('.category-header');
            if (!header) return;

            const item = header.closest('.contact-item');
            if (!item) return;

            item.classList.toggle('active');
        });
    }

    function bindMenu() {
        const logoArea = document.getElementById('logo-click-area');
        const menu = document.getElementById('dropdown-menu');

        if (logoArea && menu) {
            logoArea.addEventListener('click', e => {
                e.stopPropagation();
                menu.classList.toggle('show');
                logoArea.classList.toggle('active');
            });

            menu.addEventListener('click', e => {
                e.stopPropagation();
            });

            document.addEventListener('click', () => {
                closeDropdownMenu();
            });
        }

        bindDropdownItems();
        bindHeaderNav();
        bindContactAccordion();
        bindBackToTopButtons();
    }

    function bindBackToTopButtons() {
    document.addEventListener('click', event => {
        const button = event.target.closest('[data-back-to-top]');
        if (!button) return;

        event.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

    window.showSection = function (sectionId) {
        showSectionInternal(sectionId);
    };

    window.toggleContact = function (element) {
        if (!element) return;
        const item = element.closest('.contact-item');
        if (!item) return;
        item.classList.toggle('active');
    };

    return {
        bindMenu
    };
})();