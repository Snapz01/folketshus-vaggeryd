document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    const navLinks = document.querySelectorAll('.main-nav a');

    const getBaseName = (p) => {
        if (!p) return 'index';
        const pathOnly = p.split('#')[0];
        let segment = pathOnly.split('/').pop().split('\\').pop();
        segment = segment.replace('.html', '');
        return segment === '' ? 'index' : segment;
    };

    const currentBase = getBaseName(currentPath);

    navLinks.forEach(link => {
        link.classList.remove('active');
        
        const href = link.getAttribute('href');
        const [linkPath, linkHash] = href.split('#');
        const linkBase = getBaseName(linkPath);

        const isSamePage = (currentBase === linkBase);

        if (linkHash) {
            if (isSamePage && currentHash === `#${linkHash}`) {
                link.classList.add('active');
            }
        } else {
            if (isSamePage && !currentHash) {
                link.classList.add('active');
            }
        }
    });

    // Lyssna på klick för att direkt uppdatera klassen
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(() => {
                // Kör om logiken vid klick
                const newHash = window.location.hash;
                navLinks.forEach(l => {
                    l.classList.remove('active');
                    const h = l.getAttribute('href');
                    if (h.includes('#') && h.split('#')[1] === newHash.replace('#', '')) {
                        l.classList.add('active');
                    } else if (!h.includes('#') && getBaseName(h) === currentBase && !newHash) {
                        l.classList.add('active');
                    }
                });
            }, 50);
        });
    });
});