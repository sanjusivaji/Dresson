// For 'toggle' eye in 'password'
document.addEventListener('DOMContentLoaded', () => {                     // 'DOMContentLoaded' event 'trigger' 'only' when all 'html' elemenets will loads in 'browser' ie it used to ensure run the code after load 'all' 'html' elements(ie 'js' connot run before load 'html' and it prevents crash the application)
    function attachPasswordToggles() {
        const buttons = document.querySelectorAll('.forToggle');          //  It is the 'class' for '<button>' and we use '#' for 'id' and '.' for 'class' and if we use '<i>' just put 'i', only when using the 'querySelector()'
        buttons.forEach((item, index) => {
            item.removeEventListener('click', item.toggleHandler);
            item.toggleHandler = function () {
                const wrapper = this.closest('.password-toggle-wrapper');
                if (!wrapper) {
                    console.warn('No wrapper found for toggle button');
                    return;
                }
                const input = wrapper.querySelector('input');           // It is for retrieve '<input> data
                const icon = this.querySelector('i');                   // It is for retrieve '<i>' data
                if (!input || !icon) return;
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                if (isPassword) {
                    icon.classList.remove('fa-eye', 'fa-regular');
                    icon.classList.add('fa-eye-slash', 'fa-solid');
                } else {
                    icon.classList.remove('fa-eye-slash', 'fa-solid');
                    icon.classList.add('fa-eye', 'fa-regular');
                }
            };
            item.addEventListener('click', item.toggleHandler);
        });
    }
    attachPasswordToggles();
    window.refreshPasswordToggles = attachPasswordToggles;
});



