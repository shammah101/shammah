window.App = {
    state: {
        lastScrollPosition: 0,

        lockedPersonId: null,
        hoveredPersonId: null,

        activeProjectRow: null,
        activeProjectGroup: null,
        currentTranslateX: 0,
        dragStartX: 0,
        startTranslateX: 0,
        isPointerDown: false,
        isDraggingProject: false,

        velocityX: 0,
        lastPointerX: 0,
        lastPointerTime: 0,
        inertiaFrame: null,

        openedFromNewsSlug: null,
        isMobile: window.innerWidth <= 900,

        allProjectsData: [],
        currentSearchQuery: '',
        defaultSearchValue: 'SHAMMAH'
    },

    constants: {
        MOBILE_BREAKPOINT: 900,
        CATEGORY_LABELS: {
            competition: 'COMPETITION',
            built: 'BUILT',
            unbuilt: 'UNBUILT',
            award: 'AWARD',
            publication: 'PUBLICATION',
            exhibition: 'EXHIBITION',
            landscape: 'LANDSCAPE',
            interior: 'INTERIOR',
            planning: 'PLANNING'
        }
    },

    helpers: {
        formatCategoryLabel(value) {
            if (!value) return '';
            return App.constants.CATEGORY_LABELS[value] || String(value).replace(/_/g, ' ').toUpperCase();
        },

        formatStatusLabel(value) {
            if (!value) return '';
            return String(value).replace(/_/g, ' ').toUpperCase();
        },

        normalizeSearchText(value) {
            return String(value || '')
                .toLowerCase()
                .replace(/\s+/g, '')
                .replace(/[.,/#!$%^&*;:{}=\-_`~()"'[\]\\]/g, '');
        },

        escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        isFileProtocol() {
            return window.location.protocol === 'file:';
        },

        isMobileViewport() {
            return window.innerWidth <= App.constants.MOBILE_BREAKPOINT;
        },

        isDesktopViewport() {
            return window.innerWidth > App.constants.MOBILE_BREAKPOINT;
        },

        getFriendlyFetchErrorMessage(error, resourceLabel) {
            if (App.helpers.isFileProtocol()) {
                return `${resourceLabel} 데이터를 불러오지 못했습니다. 현재 index.html을 직접 더블클릭(file://)으로 열고 있을 가능성이 큽니다. 로컬 서버로 열어주세요.`;
            }

            if (error && /Failed to fetch|NetworkError|Load failed/i.test(error.message || '')) {
                return `${resourceLabel} 데이터를 불러오지 못했습니다. 네트워크 연결 또는 파일 경로를 확인해 주세요.`;
            }

            if (error && /HTTP/i.test(error.message || '')) {
                return `${resourceLabel} 데이터 요청은 되었지만 응답에 문제가 있습니다. 파일 경로 또는 서버 설정을 확인해 주세요.`;
            }

            if (error && /JSON/i.test(error.message || '')) {
                return `${resourceLabel} 데이터 형식(JSON)에 문제가 있습니다. 데이터 파일 문법을 확인해 주세요.`;
            }

            return `${resourceLabel} 데이터를 불러오지 못했습니다. 콘솔 오류와 파일 경로를 확인해 주세요.`;
        },

        createLoadErrorMarkup(resourceLabel, error) {
            const message = App.helpers.getFriendlyFetchErrorMessage(error, resourceLabel);
            const detail = App.helpers.escapeHtml(error?.message || 'Unknown error');

            return `
                <div class="load-error-box" style="padding:24px 0; max-width:900px; font-size:13px; line-height:1.7; color:#111;">
                    <div style="font-weight:700; text-transform:uppercase; margin-bottom:10px;">${resourceLabel} Load Error</div>
                    <div style="margin-bottom:8px;">${message}</div>
                    <div style="color:#666; font-size:12px;">${detail}</div>
                    <div style="margin-top:14px; color:#666; font-size:12px;">
                        권장 실행 방식: VS Code Live Server 또는 기타 로컬 서버 환경에서 사이트 열기
                    </div>
                </div>
            `;
        },

        async fetchJson(url, resourceLabel) {
            let response;

            try {
                response = await fetch(url, { cache: 'default' });
            } catch (networkError) {
                throw new Error(App.helpers.getFriendlyFetchErrorMessage(networkError, resourceLabel));
            }

            if (!response.ok) {
                throw new Error(`${resourceLabel} HTTP ${response.status} (${response.statusText})`);
            }

            try {
                return await response.json();
            } catch (jsonError) {
                throw new Error(`${resourceLabel} JSON parse error: ${jsonError.message}`);
            }
        }
    }
};

window.checkImageAspect = function (img) {
    const wrapper = img.parentElement;
    if (!wrapper) return;

    wrapper.classList.remove('img-landscape', 'img-portrait');

    if (img.naturalWidth >= img.naturalHeight) {
        wrapper.classList.add('img-landscape');
    } else {
        wrapper.classList.add('img-portrait');
    }
};