document.addEventListener('DOMContentLoaded', async () => {
    try {
        UIModule.bindMenu();

        ProjectsModule.bindProjectPointerEvents();
        ProjectsModule.bindProjectResize();

        NewsModule.bindNewsFilters();
        if (typeof NewsModule.bindNewsProjectLinks === 'function') {
            NewsModule.bindNewsProjectLinks();
        }

        if (typeof PeopleModule.bindPeopleEvents === 'function') {
            PeopleModule.bindPeopleEvents();
        }

        showSection('projects');

        await Promise.all([
            ProjectsModule.loadProjects(),
            NewsModule.loadNews(),
            PeopleModule.loadPeople()
        ]);

        ProjectsModule.setupProjectSearch();
    } catch (error) {
        console.error('초기화 실패:', error);
    }
});