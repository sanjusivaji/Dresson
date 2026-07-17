// public/js/shared/imageCropper.js

let cropperInstance = null;

window.ImageCropper = (function () {

    // 1. Automatically load Cropper.js CSS & Script if missing from the page
    function ensureCropperLoaded(callback) {
        if (typeof Cropper !== 'undefined') {
            return callback();
        }

        // Load CSS
        if (!document.querySelector('link[href*="cropper.min.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css';
            document.head.appendChild(link);
        }

        // Load JS
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js';
        script.onload = () => callback();
        script.onerror = () => alert('Failed to load image cropping library. Please check your internet connection.');
        document.head.appendChild(script);
    }

    function createModal() {
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

        document.getElementById('cropperCloseBtn').onclick = closeModal;
        document.getElementById('cropperCancelBtn').onclick = closeModal;

        // Attach action buttons safely
        modal.querySelectorAll('.cropper-action-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                if (!cropperInstance) return;
                const action = btn.dataset.action;
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

    function closeModal() {
        const modal = document.getElementById('cropperModal');
        if (modal) modal.style.display = 'none';
        if (cropperInstance) { 
            cropperInstance.destroy(); 
            cropperInstance = null; 
        }
    }

    function openCropper({ file, aspectRatio = NaN, onCrop }) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
        }

        // Ensure the Cropper library is loaded before creating the modal
        ensureCropperLoaded(() => {
            createModal();

            const reader = new FileReader();
            reader.onload = (e) => {
                const modal = document.getElementById('cropperModal');
                const img = document.getElementById('cropperImage');
                
                modal.style.display = 'flex';
                if (cropperInstance) { 
                    cropperInstance.destroy(); 
                    cropperInstance = null; 
                }

                // ATTACH ONLOAD BEFORE SETTING SRC TO PREVENT RACE CONDITIONS
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

                // Set image source after attaching event listener
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