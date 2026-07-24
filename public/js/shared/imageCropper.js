
let cropperInstance = null;
window.ImageCropper = (function () {
    function ensureCropperLoaded(callback) {
        if (typeof Cropper !== 'undefined') {
            return callback();
        }
        if (!document.querySelector('link[href*="cropper.min.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css';  // For 'css' file from 'cloudflare' library
            document.head.appendChild(link);
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js';     // For 'js' file from 'cloudflare' library
        script.onload = () => callback();
        script.onerror = () => {                                                                  //  For 'display' error and here we dynamically create a 'custom' message instead 'alert()'.                                                           
            const toast = document.createElement('div');
            toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:#dc3545; color:white; padding:12px 24px; border-radius:8px; z-index:100000; box-shadow:0 4px 12px rgba(0,0,0,0.3);";
            toast.innerText = "Failed to load cropping tool, check network";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);          // Remove after 4 seconds
        };
        document.head.appendChild(script);
    }
    function createModal() {                                                                     // Function for create a 'modal'
        if (document.getElementById('cropperModal')) return;
        const modal = document.createElement('div');
        modal.id = 'cropperModal';
        modal.style.cssText = `
            display:none; position:fixed; inset:0; z-index:99999;
            background:rgba(0,0,0,0.85); align-items:center; justify-content:center;
            padding: 16px; backdrop-filter: blur(4px);
        `;
        modal.innerHTML = `
            <div style="background:#111; border:1px solid #222; border-radius:16px; padding:20px; width:min(650px, 98vw); max-height:92vh; display:flex; flex-direction:column; gap:16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">            
                <div style="display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                    <p style="color:#f8f9fa; font-weight:600; font-size:16px; margin:0; letter-spacing:0.5px;">Crop & Adjust Apparel Photo</p>
                    <button id="cropperCloseBtn" style="background:none; border:none; color:#a3a3a3; font-size:26px; cursor:pointer; line-height:1; padding:4px;">&times;</button>
                </div>

                <div style="position:relative; width:100%; height:420px; max-height:55vh; overflow:hidden; background:#000; border-radius:10px; border:1px solid #222; touch-action:none; display:flex; align-items:center; justify-content:center;">
                    <img id="cropperImage" style="display:block; max-width:100%; max-height:100%;">
                </div>

                <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; flex-shrink:0; pt:4px;">
                    <button type="button" class="cropper-action-btn" data-action="rotate-left" title="Rotate Left"
                        style="padding:8px 12px; background:#1e1e1e; border:1px solid #333; color:#d4af37; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600;">↺ Rotate</button>
                    <button type="button" class="cropper-action-btn" data-action="rotate-right" title="Rotate Right"
                        style="padding:8px 12px; background:#1e1e1e; border:1px solid #333; color:#d4af37; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600;">↻ Rotate</button>
                    <button type="button" class="cropper-action-btn" data-action="zoom-in" title="Zoom In"
                        style="padding:8px 12px; background:#1e1e1e; border:1px solid #333; color:#d4af37; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600;">+ Zoom</button>
                    <button type="button" class="cropper-action-btn" data-action="zoom-out" title="Zoom Out"
                        style="padding:8px 12px; background:#1e1e1e; border:1px solid #333; color:#d4af37; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600;">− Zoom</button>
                    <button type="button" class="cropper-action-btn" data-action="flip-h" title="Flip Horizontal"
                        style="padding:8px 12px; background:#1e1e1e; border:1px solid #333; color:#d4af37; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600;">⇄ Flip</button>                    
                    <div style="margin-left:auto; display:flex; gap:10px; width:100%; justify-content:flex-end; margin-top:4px;">
                        <button type="button" id="cropperCancelBtn"
                            style="padding:10px 20px; background:#1e1e1e; border:1px solid #333; color:#a3a3a3; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">Cancel</button>
                        <button type="button" id="cropperConfirmBtn"
                            style="padding:10px 24px; background:#6b66d6; border:none; color:#ffffff; border-radius:8px; cursor:pointer; font-size:13px; font-weight:700; box-shadow: 0 4px 12px rgba(107,102,214,0.3);">Apply Crop</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('cropperCloseBtn').onclick = closeModal;                        // 'cropperCloseBtn' is the 'id' in 'ejs' file
        document.getElementById('cropperCancelBtn').onclick = closeModal;
        modal.querySelectorAll('.cropper-action-btn').forEach(item => {
            item.onclick = (e) => {
                e.preventDefault();
                if (!cropperInstance) return;                                                   // 'cropperInstance' is object created below by using 'new Cropper(img, { })'
                const action = item.dataset.action;
                if (action === 'rotate-left') cropperInstance.rotate(-90);
                if (action === 'rotate-right') cropperInstance.rotate(90);
                if (action === 'zoom-in') cropperInstance.zoom(0.1);
                if (action === 'zoom-out') cropperInstance.zoom(-0.1);
                if (action === 'flip-h') {
                    const cd = cropperInstance.getData();
                    cropperInstance.scaleX(cd.scaleX === -1 ? 1 : -1);
                }
            };
        });
    }  
    function closeModal() {                                                                     //  For 'close' the 'modal' when click the 'X' symbol or 'Close' button.       
        const modal = document.getElementById('cropperModal');
        if (modal) modal.style.display = 'none';
        if (cropperInstance) { 
            cropperInstance.destroy(); 
            cropperInstance = null; 
        }
    }
    function openCropper({ file, aspectRatio = NaN, onCrop }) {
       if (!file || !file.type.startsWith('image/')) {
            const toast = document.createElement('div');                                       // For 'display' a custom message instead we can put 'alert()'
            toast.style.cssText = "position:fixed; top:20px; right:20px; background:#e53e3e; color:#fff; padding:12px 20px; border-radius:8px; z-index:999999; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,0.3);";
            toast.innerText = "Please select a valid image file (JPG, PNG, WEBP).";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000); 
            return;
        }
        ensureCropperLoaded(() => {
            createModal();                                                                  // 'createModal()' already created above
            const reader = new FileReader();
            reader.onload = (e) => {
                const modal = document.getElementById('cropperModal');
                const img = document.getElementById('cropperImage');                            
                modal.style.display = 'flex';
                if (cropperInstance) { 
                    cropperInstance.destroy(); 
                    cropperInstance = null; 
                }
                img.onload = () => {
                    requestAnimationFrame(() => {
                        if (cropperInstance) cropperInstance.destroy();                    
                        cropperInstance = new Cropper(img, {
                            aspectRatio: aspectRatio, 
                            viewMode: 1,
                            dragMode: 'move',         
                            autoCropArea: 0.85,
                            responsive: true,
                            guides: true,
                            center: true,
                            highlight: false,
                            cropBoxMovable: true,
                            cropBoxResizable: true,
                            toggleDragModeOnDblclick: true,
                        });
                    });
                };
                img.src = e.target.result;
                document.getElementById('cropperConfirmBtn').onclick = (event) => {
                    event.preventDefault();
                    if (!cropperInstance) return;                    
                    cropperInstance.getCroppedCanvas({
                        maxWidth: 1200,
                        maxHeight: 1200,
                        fillColor: '#fff',
                        imageSmoothingEnabled: true,
                        imageSmoothingQuality: 'high',
                    }).toBlob((blob) => {
                        closeModal();
                        if (onCrop) onCrop(blob, URL.createObjectURL(blob));
                    }, 'image/jpeg', 0.92);
                };
            };
            reader.readAsDataURL(file);
        });
    }
    return { openCropper };
})();