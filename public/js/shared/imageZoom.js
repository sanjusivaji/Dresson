   // For start the 'zoom' ie scale up the image to '2.5'
    function startZoom() {
        const img = document.getElementById('mainViewerImage');  
        img.style.transform = 'scale(2.5)'; 
    }
  
  // For 'maintaining' the  'zooming'
    function handleZoom(e) {
        const container = e.currentTarget;
        const img = document.getElementById('mainViewerImage');
        const rect = container.getBoundingClientRect();          
        const x = ((e.clientX - rect.left) / rect.width) * 100;  
        const y = ((e.clientY - rect.top) / rect.height) * 100; 
        img.style.transformOrigin = `${x}% ${y}%`;
    }

    // For reset the image back to its original state when the mouse leaves
    function resetZoom() {
        const img = document.getElementById('mainViewerImage');   
        img.style.transformOrigin = 'center center';
        img.style.transform = 'scale(1)';
    }