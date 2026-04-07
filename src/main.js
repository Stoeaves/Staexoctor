import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './style.css';
import 'md-editor-v3/lib/style.css';
import { initTheme, watchSystemThemeChange } from './utils/theme';

initTheme();
watchSystemThemeChange();

createApp(App).use(router).mount('#app');
