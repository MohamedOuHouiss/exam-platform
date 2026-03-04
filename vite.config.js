import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
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
    },
});
