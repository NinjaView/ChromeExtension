// Smooth scrolling with Vanilla JS
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const sectionID = this.getAttribute('href');
        const targetSection = document.querySelector(sectionID);
        
        window.scrollTo({
            top: targetSection.offsetTop - 60, // Adjusted offset for any fixed navbar
            behavior: 'smooth'
        });
    });
});
