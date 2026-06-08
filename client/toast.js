class Toast {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        `;

        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 400); // Wait for transition
        }, 3000);
    }

    success(msg) { this.show(msg, 'success'); }
    error(msg) { this.show(msg, 'error'); }
    info(msg) { this.show(msg, 'info'); }
}

const toast = new Toast(); // Export global instance
