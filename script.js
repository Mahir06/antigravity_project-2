document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('draggable-card');
    let isDragging = false;
    let startY = 0;
    let currentY = 0;
    let startX = 0;
    let currentX = 0;
    
    // Distance needed to trigger the send animation
    const SEND_THRESHOLD = -120; 

    card.addEventListener('pointerdown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startX = e.clientX;
        currentY = 0;
        currentX = 0;
        
        // Remove transitions so it follows pointer exactly
        card.style.transition = 'none';
        card.setPointerCapture(e.pointerId);
    });

    card.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        
        currentY = e.clientY - startY;
        currentX = e.clientX - startX;
        
        // Slight rotation based on X movement for playfulness
        const rotate = currentX * 0.05;
        
        // Add resistance if trying to drag downwards
        let renderY = currentY;
        if (currentY > 0) {
            renderY = currentY * 0.2; 
        }
        
        card.style.transform = `translateY(${renderY}px) translateX(${currentX}px) rotate(${rotate}deg)`;
    });

    card.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        card.releasePointerCapture(e.pointerId);
        
        if (currentY < SEND_THRESHOLD) {
            // Threshold reached: animate into the letterbox
            
            // Remove inline styles to let the CSS class take over
            card.style.transform = ''; 
            card.classList.add('card-sent');
            
            // Reset the card after 1.5s so you can play with it again
            setTimeout(() => {
                card.style.transition = 'none';
                card.classList.remove('card-sent');
                
                // Start it from slightly below
                card.style.transform = 'translateY(150px)'; 
                
                // Force a reflow so the transition isn't applied to the reset
                void card.offsetWidth;
                
                // Animate back to original position
                card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                card.style.transform = '';
            }, 1500);
            
        } else {
            // Not dragged far enough: snap back smoothly
            card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.style.transform = '';
        }
    });
});
