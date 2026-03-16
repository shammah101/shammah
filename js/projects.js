window.ProjectsModule = (() => {
    function ensureProjectStateDefaults() {
        if (!Object.prototype.hasOwnProperty.call(App.state, 'currentProjectCategory')) {
            App.state.currentProjectCategory = 'all';
        }

        if (!Object.prototype.hasOwnProperty.call(App.state, 'projectIndexBySlug')) {
            App.state.projectIndexBySlug = {};
        }

        if (!Object.prototype.hasOwnProperty.call(App.state, 'projectOpenedFromSection')) {
            App.state.projectOpenedFromSection = null;
        }

        if (!Object.prototype.hasOwnProperty.call(App.state, 'projectOpenedFromScrollY')) {
            App.state.projectOpenedFromScrollY = 0;
        }
    }

    function getProjectIdText(idData) {
    if (idData && typeof idData === 'object' && !Array.isArray(idData)) {
        return idData.value || idData.text || '';
    }

    return typeof idData === 'string' ? idData : '';
}

function renderProjectIdBox(idData, projectTitle = '') {
    if (idData && typeof idData === 'object' && !Array.isArray(idData)) {
        if (idData.type === 'image' && idData.src) {
            const alt = idData.alt || `${projectTitle} id image`;

            return `
                <div class="project-id-box project-id-box--image">
                    <img
                        src="${idData.src}"
                        alt="${alt}"
                        class="project-id-image"
                        loading="lazy"
                        decoding="async"
                    >
                </div>
            `;
        }

        const textValue = idData.value || idData.text || '';

        return `
            <div class="project-id-box project-id-box--text">
                <span class="project-id-text">${textValue}</span>
            </div>
        `;
    }

    return `
        <div class="project-id-box project-id-box--text">
            <span class="project-id-text">${idData || ''}</span>
        </div>
    `;
}

    function projectMatchesSearch(project, query) {
        if (!query || !query.trim()) return true;

        const normalizedQuery = App.helpers.normalizeSearchText(query);
        if (!normalizedQuery) return true;

        const candidates = [
            project.title,
            project.location,
            project.year,
            project.category,
            App.helpers.formatCategoryLabel(project.category),
            project.status,
            App.helpers.formatStatusLabel(project.status),
            getProjectIdText(project.id)
        ];

        return candidates.some(candidate => {
            const normalizedCandidate = App.helpers.normalizeSearchText(candidate);
            return normalizedCandidate.includes(normalizedQuery);
        });
    }

    function projectMatchesCategory(project, category) {
        if (!category || category === 'all') return true;
        return project.category === category;
    }

    function getProjectBySlug(slug) {
        if (!slug) return null;
        return App.state.projectIndexBySlug?.[slug] || null;
    }

    function renderProjectRowsVisibility() {
        const rows = document.querySelectorAll('.project-row');
        const activeRow = document.querySelector('.project-row.active');

        rows.forEach(row => {
            const slug = row.dataset.projectSlug;
            const project = getProjectBySlug(slug);

            if (!project) {
                row.style.display = 'none';
                row.style.opacity = '1';
                return;
            }

            const matchesCategory = projectMatchesCategory(project, App.state.currentProjectCategory);
            const matchesSearch = projectMatchesSearch(project, App.state.currentSearchQuery);
            const shouldShow = matchesCategory && matchesSearch;

            if (activeRow) {
                if (row === activeRow) {
                    row.style.display = 'flex';
                    row.style.opacity = '1';
                } else {
                    row.style.display = 'none';
                    row.style.opacity = '0';
                }
                return;
            }

            row.style.display = shouldShow ? 'flex' : 'none';
            row.style.opacity = '1';
        });
    }

    function clampProjectX(group, x) {
        if (!group) return 0;
        const viewportWidth = window.innerWidth;
        const groupWidth = group.scrollWidth;
        const minX = Math.min(0, viewportWidth - groupWidth);
        const maxX = 0;
        return Math.max(minX, Math.min(maxX, x));
    }

    function applyProjectTranslate(x) {
        if (!App.state.activeProjectGroup) return;
        App.state.currentTranslateX = clampProjectX(App.state.activeProjectGroup, x);
        App.state.activeProjectGroup.style.transform = `translate3d(${App.state.currentTranslateX}px, 0, 0)`;
    }

    function stopInertia() {
        if (App.state.inertiaFrame) {
            cancelAnimationFrame(App.state.inertiaFrame);
            App.state.inertiaFrame = null;
        }
    }

    function setupProjectDrag(row) {
        if (App.state.isMobile) return;

        const group = row.querySelector('.project-content-group');
        if (!group) return;

        App.state.activeProjectRow = row;
        App.state.activeProjectGroup = group;
        App.state.currentTranslateX = 0;
        group.style.transform = 'translate3d(0px, 0, 0)';

        group.querySelectorAll('img').forEach(img => {
            img.setAttribute('draggable', 'false');
            if (img.dataset.dragstartBound === 'true') return;
            img.dataset.dragstartBound = 'true';
            img.addEventListener('dragstart', e => e.preventDefault());
        });
    }

    function destroyProjectDrag() {
        if (App.state.activeProjectGroup) {
            App.state.activeProjectGroup.style.transform = '';
        }

        App.state.activeProjectRow = null;
        App.state.activeProjectGroup = null;
        App.state.currentTranslateX = 0;
        App.state.dragStartX = 0;
        App.state.startTranslateX = 0;
        App.state.isPointerDown = false;
        App.state.isDraggingProject = false;
    }

    function restoreSectionAfterNewsProjectClose() {
        const sourceSection = App.state.projectOpenedFromSection;
        const sourceScrollY = App.state.projectOpenedFromScrollY || 0;

        App.state.projectOpenedFromSection = null;
        App.state.projectOpenedFromScrollY = 0;
        App.state.openedFromNewsSlug = null;

        if (sourceSection) {
            showSection(sourceSection);
            requestAnimationFrame(() => {
                window.scrollTo(0, sourceScrollY);
            });
            return true;
        }

        return false;
    }

    function closeProjectDetail(row) {
        if (!row) return;

        row.classList.remove('active');
        document.body.classList.remove('project-detail-open');

        stopInertia();
        destroyProjectDrag();
        renderProjectRowsVisibility();

        if (App.state.openedFromNewsSlug) {
            const restored = restoreSectionAfterNewsProjectClose();
            if (restored) return;
        }

        window.scrollTo(0, App.state.lastScrollPosition);
    }

    function openProjectDetail(row) {
        if (!row) return;

        App.state.lastScrollPosition = window.scrollY || window.pageYOffset;

        document.querySelectorAll('.project-row').forEach(item => {
            if (item !== row) {
                item.style.opacity = '0';
                item.style.display = 'none';
            }
        });

        row.style.display = 'flex';
        row.style.opacity = '1';
        row.classList.add('active');
        document.body.classList.add('project-detail-open');

        if (App.state.isMobile) {
            destroyProjectDrag();
            requestAnimationFrame(() => {
                row.scrollTop = 0;
            });
        } else {
            requestAnimationFrame(() => {
                setupProjectDrag(row);
            });
        }
    }

    function resetProjectScrollPosition() {
        window.scrollTo({
            top: 0,
            behavior: 'auto'
        });
    }

    function applyCategoryFilter(category) {
        ensureProjectStateDefaults();
        App.state.currentProjectCategory = category || 'all';

        const currentActive = document.querySelector('.project-row.active');
        if (currentActive) {
            closeProjectDetail(currentActive);
        } else {
            renderProjectRowsVisibility();
        }

        resetProjectScrollPosition();
    }

    function setupProjectSearch() {
        const searchInput = document.getElementById('project-search-input');
        if (!searchInput) return;

        searchInput.addEventListener('focus', () => {
            if (searchInput.value === App.state.defaultSearchValue) {
                searchInput.value = '';
            }
        });

        searchInput.addEventListener('blur', () => {
            if (!searchInput.value.trim()) {
                searchInput.value = App.state.defaultSearchValue;
                App.state.currentSearchQuery = '';
                renderProjectRowsVisibility();
            }
        });

        searchInput.addEventListener('input', e => {
            const rawValue = e.target.value || '';
            App.state.currentSearchQuery = rawValue === App.state.defaultSearchValue ? '' : rawValue;

            showSection('projects');

            const currentActive = document.querySelector('.project-row.active');
            if (currentActive) {
                closeProjectDetail(currentActive);
            }

            renderProjectRowsVisibility();
        });
    }

    function renderProjectsLoadError(container, error) {
        if (!container) return;
        container.innerHTML = App.helpers.createLoadErrorMarkup('Projects', error);
    }

    function bindProjectFilterButtons() {
        const buttons = document.querySelectorAll('[data-project-filter]');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.dataset.projectFilter || 'all';
                applyCategoryFilter(category);
            });
        });
    }

    function bindProjectRowEvents() {
        const rows = document.querySelectorAll('.project-row');

        rows.forEach(row => {
            row.addEventListener('click', event => {
                const closeButton = event.target.closest('.project-close-button');
                if (closeButton) return;

                const isActive = row.classList.contains('active');

                if (isActive) {
                    if (App.state.isMobile) return;
                    if (App.state.isDraggingProject) return;

                    const clickedInsideImage = event.target.closest('.project-image-box, .detail-image');
                    if (!clickedInsideImage) {
                        closeProjectDetail(row);
                    }
                    return;
                }

                openProjectDetail(row);
            });
        });

        const closeButtons = document.querySelectorAll('.project-close-button');
        closeButtons.forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();

                const row = button.closest('.project-row');
                if (!row) return;

                closeProjectDetail(row);
            });
        });
    }

    function bindProjectImageAspectHandlers(scope = document) {
        const images = scope.querySelectorAll('.project-image-box img, .detail-image img');

        images.forEach(img => {
            if (img.dataset.aspectBound === 'true') return;
            img.dataset.aspectBound = 'true';

            img.addEventListener('load', () => {
                checkImageAspect(img);
            });

            if (img.complete && img.naturalWidth > 0) {
                checkImageAspect(img);
            }
        });
    }

    function bindProjectPointerEvents() {
        document.addEventListener('pointerdown', e => {
            if (App.state.isMobile) return;

            const activeRow = document.querySelector('.project-row.active');
            if (!activeRow) return;

            const group = activeRow.querySelector('.project-content-group');
            if (!group) return;
            if (!e.target.closest('.project-content-group')) return;

            stopInertia();

            App.state.isPointerDown = true;
            App.state.isDraggingProject = false;
            App.state.dragStartX = e.clientX;
            App.state.startTranslateX = App.state.currentTranslateX;

            App.state.velocityX = 0;
            App.state.lastPointerX = e.clientX;
            App.state.lastPointerTime = performance.now();

            group.setPointerCapture?.(e.pointerId);
        });

        document.addEventListener('pointermove', e => {
            if (App.state.isMobile) return;
            if (!App.state.isPointerDown || !App.state.activeProjectGroup) return;

            const deltaX = e.clientX - App.state.dragStartX;

            if (Math.abs(deltaX) > 6) {
                App.state.isDraggingProject = true;
            }

            const now = performance.now();
            const dt = Math.max(1, now - App.state.lastPointerTime);
            App.state.velocityX = (e.clientX - App.state.lastPointerX) / dt;

            App.state.lastPointerX = e.clientX;
            App.state.lastPointerTime = now;

            if (App.state.isDraggingProject) {
                applyProjectTranslate(App.state.startTranslateX + deltaX);
                e.preventDefault();
            }
        });

        document.addEventListener('pointerup', () => {
            if (App.state.isMobile) return;
            if (!App.state.isPointerDown) return;

            App.state.isPointerDown = false;

            if (Math.abs(App.state.velocityX) > 0.01 && App.state.activeProjectGroup) {
                let momentum = App.state.velocityX * 17;

                const animateInertia = () => {
                    momentum *= 0.90;

                    if (Math.abs(momentum) < 0.2) {
                        App.state.inertiaFrame = null;
                        setTimeout(() => {
                            App.state.isDraggingProject = false;
                        }, 0);
                        return;
                    }

                    applyProjectTranslate(App.state.currentTranslateX + momentum);
                    App.state.inertiaFrame = requestAnimationFrame(animateInertia);
                };

                App.state.inertiaFrame = requestAnimationFrame(animateInertia);
            } else {
                setTimeout(() => {
                    App.state.isDraggingProject = false;
                }, 0);
            }
        });

        document.addEventListener('pointercancel', () => {
            if (App.state.isMobile) return;
            App.state.isPointerDown = false;
            App.state.isDraggingProject = false;
            stopInertia();
        });
    }

    function bindProjectResize() {
        let resizeFrame = null;

        window.addEventListener('resize', () => {
            if (resizeFrame) cancelAnimationFrame(resizeFrame);

            resizeFrame = requestAnimationFrame(() => {
                resizeFrame = null;

                const wasMobile = App.state.isMobile;
                App.state.isMobile = window.innerWidth <= 900;

                if (App.state.activeProjectGroup && !App.state.isMobile) {
                    applyProjectTranslate(App.state.currentTranslateX);
                }

                if (wasMobile !== App.state.isMobile) {
                    const currentActive = document.querySelector('.project-row.active');

                    if (currentActive) {
                        if (App.state.isMobile) {
                            stopInertia();
                            destroyProjectDrag();
                        } else {
                            requestAnimationFrame(() => {
                                setupProjectDrag(currentActive);
                            });
                        }
                    }
                }
            });
        }, { passive: true });
    }

    async function loadProjects() {
        const container = document.getElementById('projects-container');

        try {
            ensureProjectStateDefaults();

            const data = await App.helpers.fetchJson('data/projects.json', 'Projects');

            if (!container || !data.projects) return;

            App.state.allProjectsData = data.projects;
            App.state.projectIndexBySlug = data.projects.reduce((acc, project) => {
                acc[project.slug] = project;
                return acc;
            }, {});

            container.innerHTML = data.projects.map(project => {
                const contentsHtmlParts = [];

function isFilled(value) {
    return typeof value === 'string' && value.trim() !== '';
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderTextBlock(title, body, langClass = '') {
    if (!isFilled(title) && !isFilled(body)) return '';

    const titleHtml = isFilled(title)
        ? `<div class="detail-title">${escapeHtml(title)}</div>`
        : '';

    const bodyHtml = isFilled(body)
        ? `<div class="detail-body ${langClass}">${escapeHtml(body)}</div>`
        : '';

    return `${titleHtml}${bodyHtml}`;
}

function renderTextColumn(item) {
    const hasEn = isFilled(item.title_en) || isFilled(item.body_en);
    const hasKo = isFilled(item.title_ko) || isFilled(item.body_ko);

    if (!hasEn && !hasKo) return '';

    // 기존 방식 유지: 한 text 안에 EN + KO 둘 다 있으면 한 column 안에 세로 배치
    if (hasEn && hasKo) {
        return `
            <div class="detail-column">
                <div class="detail-text-block">
                    ${renderTextBlock(item.title_en, item.body_en, 'detail-body-en')}
                    <div class="lang-spacer"></div>
                    ${renderTextBlock(item.title_ko, item.body_ko, 'detail-body-ko')}
                </div>
            </div>
        `;
    }

    // EN만 있는 경우
    if (hasEn) {
        return `
            <div class="detail-column">
                <div class="detail-text-block">
                    ${renderTextBlock(item.title_en, item.body_en, 'detail-body-en')}
                </div>
            </div>
        `;
    }

    // KO만 있는 경우
    return `
        <div class="detail-column">
            <div class="detail-text-block">
                ${renderTextBlock(item.title_ko, item.body_ko, 'detail-body-ko')}
            </div>
        </div>
    `;
}

project.contents.forEach(item => {
    if (item.type === 'text') {
        contentsHtmlParts.push(renderTextColumn(item));
    }

    if (item.type === 'image') {
        contentsHtmlParts.push(
            `<div class="detail-image"><img src="${item.src}" alt="Project Image" draggable="false" loading="lazy" decoding="async"></div>`
        );
    }
});

const contentsHtml = contentsHtmlParts.join('');

                return `
                    <section class="project-row" data-project-slug="${project.slug}" data-category="${project.category}">
                        <div class="project-content-group">
                            <div class="project-info">
                                <div class="project-info-top">
                                    ${renderProjectIdBox(project.id, project.title)}
                                    <button type="button" class="project-close-button" aria-label="Close project detail">Close</button>
                                </div>

                                <h2 class="text-[16px] font-bold uppercase leading-tight">${project.title}</h2>
                                <p class="text-[11px] text-gray-400 uppercase mt-2">${project.location}</p>

                                <div class="project-meta">
                                    <div class="project-meta-item">
                                        <div class="project-meta-label">YEAR</div>
                                        <div class="project-meta-value">${project.year || ''}</div>
                                    </div>
                                    <div class="project-meta-item">
                                        <div class="project-meta-label">CATEGORY</div>
                                        <div class="project-meta-value">${App.helpers.formatCategoryLabel(project.category)}</div>
                                    </div>
                                    <div class="project-meta-item">
                                        <div class="project-meta-label">STATUS</div>
                                        <div class="project-meta-value">${App.helpers.formatStatusLabel(project.status)}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="project-image-box">
                                <img src="${project.image}" alt="${project.title}" draggable="false" loading="lazy" decoding="async">
                            </div>

                            <div class="project-details">
                                ${contentsHtml}
                            </div>
                        </div>
                    </section>
                `;
            }).join('');

            bindProjectRowEvents();
            bindProjectFilterButtons();
            bindProjectImageAspectHandlers(container);
            renderProjectRowsVisibility();
        } catch (e) {
            console.error('프로젝트 로드 실패:', e);
            renderProjectsLoadError(container, e);
        }
    }

    window.filterProjects = function (category) {
        applyCategoryFilter(category);
    };

    window.toggleProjectDetail = function (element, event) {
        if (!element) return;

        const isActive = element.classList.contains('active');

        if (isActive) {
            if (App.state.isMobile) return;
            if (App.state.isDraggingProject) return;

            const clickedInsideImage = event && event.target.closest('.project-image-box, .detail-image');
            if (!clickedInsideImage) {
                closeProjectDetail(element);
            }
            return;
        }

        openProjectDetail(element);
    };

    window.closeProjectDetail = closeProjectDetail;

    window.closeProjectFromButton = function (event, button) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const row = button?.closest('.project-row');
        if (!row) return;

        closeProjectDetail(row);
    };

    return {
        loadProjects,
        setupProjectSearch,
        bindProjectPointerEvents,
        bindProjectResize,
        closeProjectDetail
    };
})();