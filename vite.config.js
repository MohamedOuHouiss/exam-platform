import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/exam-platform/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                qcm: resolve(__dirname, 'qcm.html'),
                redaction: resolve(__dirname, 'redaction.html'),
            },
        },
    },
    server: {
        port: 5173,
        open: true,
        allowedHosts: ["f8712647-9453-4d4f-aeda-2900bc4ed55d-00-34nj0hna037lg.riker.replit.dev"]
    },
});
