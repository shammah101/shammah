window.NewsModule = (() => {
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatCategoryLabel(label) {
        return String(label || '')
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    function parseYearValues(rawYear) {
        const value = String(rawYear || '').trim();
        if (!value) return [];

        const normalized = value.replace(/\s+/g, '');
        const rangeMatch = normalized.match(/^(\d{4})[~\-–](\d{4})$/);

        if (rangeMatch) {
            const start = Number(rangeMatch[1]);
            const end = Number(rangeMatch[2]);

            if (Number.isNaN(start) || Number.isNaN(end)) return [];
            if (end < start) return [String(start)];

            const years = [];
            for (let y = start; y <= end; y += 1) {
                years.push(String(y));
            }
            return years;
        }

        return [value];
    }

    function getAllFilterYears(newsItems) {
        const yearSet = new Set();

        newsItems.forEach(item => {
            parseYearValues(item.year).forEach(year => {
                yearSet.add(year);
            });
        });

        return [...yearSet].sort((a, b) => Number(b) - Number(a));
    }

    function getAllFilterCategories(newsItems) {
        const categoryMap = new Map();

        newsItems.forEach(item => {
            const slug = String(item.cat_slug || '').trim().toLowerCase();
            const label = String(item.category || '').trim();

            if (!slug || !label) return;

            if (!categoryMap.has(slug)) {
                categoryMap.set(slug, label);
            }
        });

        return [...categoryMap.entries()].map(([slug, label]) => ({
            slug,
            label
        }));
    }

    function renderCategoryFilterOptions(categoryFilter, newsItems) {
        if (!categoryFilter) return;

        const currentValue = categoryFilter.value || 'all';
        const categories = getAllFilterCategories(newsItems);

        categoryFilter.innerHTML = `
            <option value="all">All</option>
            ${categories.map(item => `
                <option value="${escapeHtml(item.slug)}">${escapeHtml(formatCategoryLabel(item.label))}</option>
            `).join('')}
        `;

        const hasCurrentValue = categories.some(item => item.slug === currentValue);
        categoryFilter.value = hasCurrentValue ? currentValue : 'all';
    }

    function filterNewsRows() {
        const catFilter = document.getElementById('category-filter');
        const dateFilter = document.getElementById('date-filter');
        const newsSearchInput = document.getElementById('news-search-input');

        if (!dateFilter) return;

        const categoryValue = catFilter ? catFilter.value : 'all';
        const dateValue = dateFilter.value;
        const searchValue = App.helpers.normalizeSearchText(newsSearchInput?.value || '');

        document.querySelectorAll('#news-list tr').forEach(row => {
            const matchCategory = (categoryValue === 'all' || row.dataset.category === categoryValue);

            const rowYears = String(row.dataset.years || '')
                .split(',')
                .map(value => value.trim())
                .filter(Boolean);

            const matchDate = (dateValue === 'all' || rowYears.includes(dateValue));

            const rowSearchSource = row.dataset.search || row.textContent || '';
            const matchSearch = !searchValue || App.helpers.normalizeSearchText(rowSearchSource).includes(searchValue);

            row.style.display = (matchCategory && matchDate && matchSearch) ? '' : 'none';
        });
    }

    function renderNewsLoadError(tbody, error) {
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="3">
                    ${App.helpers.createLoadErrorMarkup('News', error)}
                </td>
            </tr>
        `;
    }

    function openNewsProjectBySlug(slug) {
        if (!slug) return;

        App.state.projectOpenedFromSection = 'news';
        App.state.projectOpenedFromScrollY = window.scrollY || window.pageYOffset;
        App.state.openedFromNewsSlug = slug;

        showSection('projects');

        requestAnimationFrame(() => {
            const currentActive = document.querySelector('.project-row.active');

            if (currentActive) {
                closeProjectDetail(currentActive);
            }

            const targetRow = document.querySelector(`.project-row[data-project-slug="${slug}"]`);

            if (targetRow && !targetRow.classList.contains('active')) {
                toggleProjectDetail(targetRow);
            }
        });
    }

    function bindNewsProjectLinks() {
        const newsList = document.getElementById('news-list');
        if (!newsList) return;

        newsList.addEventListener('click', event => {
            const button = event.target.closest('.news-project-link');
            if (!button) return;

            event.preventDefault();
            const slug = button.dataset.projectSlug;
            openNewsProjectBySlug(slug);
        });
    }

    function isNewsItemLinked(item) {
        const linkType = String(item.link_type || '').trim().toLowerCase();

        if (linkType === 'project' && item.project_slug) return true;
        if (linkType === 'external' && item.external_url) return true;

        return false;
    }

    function getNewsTitleMarkup(item) {
        const title = escapeHtml(item.title || '');
        const titleSub = escapeHtml(item.title_sub || '');

        return `
            <span class="news-title-main">${title}</span>
            ${titleSub ? `<span class="news-title-sub">${titleSub}</span>` : ''}
        `;
    }

    function renderNewsTitle(item) {
        const linkType = String(item.link_type || '').trim().toLowerCase();
        const titleMarkup = getNewsTitleMarkup(item);

        if (linkType === 'project' && item.project_slug) {
            return `
                <button
                    type="button"
                    class="news-title-control news-project-link"
                    data-project-slug="${escapeHtml(item.project_slug)}"
                >
                    ${titleMarkup}
                </button>
            `;
        }

        if (linkType === 'external' && item.external_url) {
            return `
                <a
                    href="${escapeHtml(item.external_url)}"
                    class="news-title-control news-external-link"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ${titleMarkup}
                </a>
            `;
        }

        return `
            <span class="news-title-control news-title-text">
                ${titleMarkup}
            </span>
        `;
    }

    async function loadNews() {
        const tbody = document.getElementById('news-list');
        const categoryFilter = document.getElementById('category-filter');
        const dateFilter = document.getElementById('date-filter');

        try {
            const data = await App.helpers.fetchJson('data/news.json', 'News');
            const newsItems = Array.isArray(data) ? data : data.news;

            if (!tbody || !Array.isArray(newsItems)) return;

            const uniqueYears = getAllFilterYears(newsItems);
            renderCategoryFilterOptions(categoryFilter, newsItems);

            if (dateFilter) {
                const currentValue = dateFilter.value || 'all';

                dateFilter.innerHTML = `
                    <option value="all">All</option>
                    ${uniqueYears.map(year => `
                        <option value="${escapeHtml(year)}">${escapeHtml(year)}</option>
                    `).join('')}
                `;

                const hasCurrentValue = uniqueYears.includes(currentValue);
                dateFilter.value = hasCurrentValue ? currentValue : 'all';
            }

            tbody.innerHTML = newsItems.map(item => {
                const years = parseYearValues(item.year);

                return `
                    <tr
                        data-category="${escapeHtml(item.cat_slug || '')}"
                        data-date="${escapeHtml(item.year || '')}"
                        data-years="${escapeHtml(years.join(','))}"
                        data-search="${escapeHtml(`${item.title || ''} ${item.title_sub || ''} ${item.category || ''} ${item.date || ''} ${item.year || ''}`)}"
                    >
                        <td class="news-item-title ${isNewsItemLinked(item) ? 'news-item-title--linked' : 'news-item-title--static'}">
                            ${renderNewsTitle(item)}
                        </td>
                        <td class="news-category">${escapeHtml(item.category || '')}</td>
                        <td class="news-date">
                            <span class="news-date-text">${escapeHtml(item.date || '')}</span>
                        </td>
                    </tr>
                `;
            }).join('');

            filterNewsRows();
        } catch (error) {
            console.error('뉴스 로드 실패:', error);
            renderNewsLoadError(tbody, error);
        }
    }

    function bindNewsFilters() {
        const catFilter = document.getElementById('category-filter');
        const dateFilter = document.getElementById('date-filter');
        const newsSearchInput = document.getElementById('news-search-input');

        if (catFilter) {
            catFilter.addEventListener('change', filterNewsRows);
        }

        if (dateFilter) {
            dateFilter.addEventListener('change', filterNewsRows);
        }

        if (newsSearchInput) {
            newsSearchInput.addEventListener('input', filterNewsRows);
        }
    }

    window.openNewsProject = function (slug) {
        openNewsProjectBySlug(slug);
    };

    return {
        loadNews,
        bindNewsFilters,
        bindNewsProjectLinks,
        filterNewsRows
    };
})();