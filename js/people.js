window.PeopleModule = (() => {
    function getViewerElements() {
        return {
            viewer: document.getElementById('fixed-photo-viewer'),
            viewerImg: document.getElementById('viewer-img')
        };
    }

    function getPeopleContainer() {
        return document.getElementById('people-container');
    }

    function getPersonItemById(personId) {
        if (!personId) return null;
        return document.querySelector(`.person-item[data-person-id="${personId}"]`);
    }

    function setViewerImage(imgSrc) {
        const { viewer, viewerImg } = getViewerElements();
        if (!viewer || !viewerImg || !imgSrc) return;

        if (viewerImg.getAttribute('src') !== imgSrc) {
            viewerImg.src = imgSrc;
        }

        viewer.style.opacity = '1';
    }

    function hideViewer() {
        const { viewer, viewerImg } = getViewerElements();
        if (!viewer || !viewerImg) return;

        viewer.style.opacity = '0';
        viewerImg.removeAttribute('src');
    }

    function getActivePersonItem() {
        return document.querySelector('.person-item.active');
    }

    function getPersonImageById(personId) {
        const item = getPersonItemById(personId);
        return item ? item.getAttribute('data-img') : '';
    }

    function clearPeopleSwitchingClass() {
        requestAnimationFrame(() => {
            document.body.classList.remove('people-switching');
        });
    }

    function syncViewerToState() {
        if (!App.helpers.isDesktopViewport()) {
            hideViewer();
            return;
        }

        const priorityPersonId = App.state.lockedPersonId || App.state.hoveredPersonId;
        if (!priorityPersonId) {
            hideViewer();
            return;
        }

        const imgSrc = getPersonImageById(priorityPersonId);
        if (imgSrc) {
            setViewerImage(imgSrc);
        } else {
            hideViewer();
        }
    }

    function collapseAllPeople() {
        document.querySelectorAll('.person-item.active').forEach(item => {
            item.classList.remove('active');
        });
    }

    function togglePersonItem(item) {
        if (!item) return;

        const personId = item.dataset.personId;
        const isActive = item.classList.contains('active');
        const currentActive = getActivePersonItem();
        const isDesktop = App.helpers.isDesktopViewport();
        const isSwitching = isDesktop && currentActive && currentActive !== item;

        if (isSwitching) {
            document.body.classList.add('people-switching');
        }

        collapseAllPeople();

        if (isActive) {
            App.state.lockedPersonId = null;
            syncViewerToState();
            if (isSwitching) clearPeopleSwitchingClass();
            return;
        }

        item.classList.add('active');
        App.state.lockedPersonId = personId;
        syncViewerToState();

        if (isSwitching) {
            clearPeopleSwitchingClass();
        }
    }

    function handleHoverEnter(item) {
        if (!item || !App.helpers.isDesktopViewport()) return;

        App.state.hoveredPersonId = item.dataset.personId || null;

        if (App.state.lockedPersonId && App.state.lockedPersonId !== App.state.hoveredPersonId) {
            return;
        }

        syncViewerToState();
    }

    function handleHoverLeave(item) {
        if (!item || !App.helpers.isDesktopViewport()) return;

        const leavingId = item.dataset.personId || null;
        if (App.state.hoveredPersonId === leavingId) {
            App.state.hoveredPersonId = null;
        }

        syncViewerToState();
    }

    function restoreLockedPersonViewer() {
        syncViewerToState();
    }

    function renderPeopleLoadError(container, error) {
        if (!container) return;
        container.innerHTML = App.helpers.createLoadErrorMarkup('People', error);
    }

    function bindPeopleEvents() {
        const container = getPeopleContainer();
        if (!container || container.dataset.peopleBound === 'true') return;

        container.dataset.peopleBound = 'true';

        container.addEventListener('click', event => {
            const header = event.target.closest('.person-header');
            if (!header) return;

            const item = header.closest('.person-item');
            if (!item) return;

            togglePersonItem(item);
        });

        container.addEventListener('mouseover', event => {
            const item = event.target.closest('.person-item');
            if (!item || !container.contains(item)) return;

            const related = event.relatedTarget;
            if (related && item.contains(related)) return;

            handleHoverEnter(item);
        });

        container.addEventListener('mouseout', event => {
            const item = event.target.closest('.person-item');
            if (!item || !container.contains(item)) return;

            const related = event.relatedTarget;
            if (related && item.contains(related)) return;

            handleHoverLeave(item);
        });

        let resizeFrame = null;

        window.addEventListener('resize', () => {
            if (resizeFrame) cancelAnimationFrame(resizeFrame);

            resizeFrame = requestAnimationFrame(() => {
                resizeFrame = null;

                const nextIsMobile = App.helpers.isMobileViewport();
                App.state.isMobile = nextIsMobile;

                if (nextIsMobile) {
                    App.state.hoveredPersonId = null;
                }

                syncViewerToState();
            });
        }, { passive: true });
    }

    async function loadPeople() {
        const container = getPeopleContainer();

        try {
            const data = await App.helpers.fetchJson('data/people.json', 'People');
            const peopleGroups = Array.isArray(data) ? data : data.people;

            const hiddenPeople = ['박혜지', '김하진', '김하유'];

            const visibleGroups = peopleGroups
                .map(group => ({
                    ...group,
                    members: (group.members || []).filter(person => !hiddenPeople.includes(person.name_ko))
                }))
                .filter(group => group.members.length > 0);

            container.innerHTML = visibleGroups.map(group => `
                <div class="people-group">
                    <div class="people-label">${group.group}</div>
                    ${group.members.map((person, index) => {
                        const personId = person.id || `${group.group}-${index}-${person.name_en}`
                            .toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(/[^a-z0-9-_]/g, '');

                        return `
                            <div class="person-item" data-person-id="${personId}" data-img="${person.img}">
                                <div class="person-header">
                                    <div class="name-left">
                                        <span class="toggle-icon">+</span>
                                        <span class="person-name-en">${person.name_en}</span>
                                    </div>
                                    <div class="name-right-wrapper">
                                        <span class="person-name-ko">${person.name_ko}</span>
                                    </div>
                                </div>
                                <div class="person-bio-wrapper">
                                    <div class="person-bio-content">
                                        <p class="bio-text">${person.bio}</p>
                                        ${person.bio_ko ? `<div class="bio-lang-spacer"></div><p class="bio-text bio-text-ko">${person.bio_ko}</p>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `).join('');

            collapseAllPeople();
            App.state.hoveredPersonId = null;

            if (App.state.lockedPersonId && !getPersonItemById(App.state.lockedPersonId)) {
                App.state.lockedPersonId = null;
            }

            syncViewerToState();
        } catch (e) {
            console.error('인물 데이터 로드 실패:', e);
            renderPeopleLoadError(container, e);
        }
    }

    window.togglePerson = function (element) {
        const item = element?.closest('.person-item');
        if (!item) return;
        togglePersonItem(item);
    };

    window.showHoverPhoto = function (element) {
        handleHoverEnter(element);
    };

    window.handlePersonLeave = function (element) {
        handleHoverLeave(element);
    };

    return {
        loadPeople,
        bindPeopleEvents,
        restoreLockedPersonViewer,
        hideViewer
    };
})();