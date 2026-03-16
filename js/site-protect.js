(() => {
    function isEditableTarget(target) {
        if (!target) return false;

        return !!target.closest(
            'input, textarea, [contenteditable="true"], [contenteditable=""], select, option'
        );
    }

    function isProtectedMediaTarget(target) {
        if (!target) return false;

        return !!target.closest(
            'img, picture, video, canvas, svg, .project-image-box, .detail-image, .fixed-photo-viewer, .about-image-wrapper, .careers-image-wrapper'
        );
    }

    function shouldBlockShortcut(event) {
        const key = String(event.key || '').toUpperCase();
        const cmdOrCtrl = event.ctrlKey || event.metaKey;

        if (key === 'F12') return true;

        if (cmdOrCtrl && event.shiftKey && ['I', 'J', 'C', 'K'].includes(key)) {
            return true;
        }

        if (cmdOrCtrl && ['U', 'S'].includes(key)) {
            return true;
        }

        return false;
    }

    function lockMediaAttributes(root = document) {
        root.querySelectorAll('img, video').forEach((el) => {
            el.setAttribute('draggable', 'false');
            el.setAttribute('oncontextmenu', 'return false');
        });
    }

    document.addEventListener(
        'contextmenu',
        (event) => {
            if (isEditableTarget(event.target)) return;
            event.preventDefault();
        },
        true
    );

    document.addEventListener(
        'dragstart',
        (event) => {
            if (isProtectedMediaTarget(event.target)) {
                event.preventDefault();
            }
        },
        true
    );

    document.addEventListener(
        'selectstart',
        (event) => {
            if (isEditableTarget(event.target)) return;

            if (isProtectedMediaTarget(event.target)) {
                event.preventDefault();
            }
        },
        true
    );

    document.addEventListener(
        'keydown',
        (event) => {
            if (shouldBlockShortcut(event)) {
                event.preventDefault();
                event.stopPropagation();
            }
        },
        true
    );

    document.addEventListener(
        'copy',
        (event) => {
            const selection = window.getSelection ? window.getSelection() : null;
            const anchorNode = selection && selection.anchorNode ? selection.anchorNode : null;
            const targetElement =
                anchorNode && anchorNode.nodeType === 1
                    ? anchorNode
                    : anchorNode && anchorNode.parentElement
                    ? anchorNode.parentElement
                    : null;

            if (targetElement && isProtectedMediaTarget(targetElement)) {
                event.preventDefault();
            }
        },
        true
    );

    document.addEventListener('DOMContentLoaded', () => {
        lockMediaAttributes();
    });

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;

                if (node.matches && (node.matches('img') || node.matches('video'))) {
                    node.setAttribute('draggable', 'false');
                    node.setAttribute('oncontextmenu', 'return false');
                }

                if (node.querySelectorAll) {
                    lockMediaAttributes(node);
                }
            });
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();