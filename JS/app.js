// JS/app.js - Versión restaurada: partículas, accesibilidad, modales y conexión a API PHP (/SENA/)

document.addEventListener('DOMContentLoaded', () => {
    // Usuario actual
    let currentUser = null;

    // API base fija para desarrollo local con XAMPP/Live Server
    // Usar la URL explícita evita problemas al servir el frontend con Live Server u otro servidor distinto a Apache
    const API_BASE_URL = 'http://localhost/SENA/';
    const API_ENDPOINTS = {
        login: API_BASE_URL + 'PHP/api/login.php',
        register: API_BASE_URL + 'PHP/api/register.php',
        verify: API_BASE_URL + 'PHP/api/verify_token.php'
    };

    // DOM
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const loginLink = document.getElementById('loginLink');
    const logoutLink = document.getElementById('logoutLink');
    const loginMenuItem = document.getElementById('loginMenuItem');
    const logoutMenuItem = document.getElementById('logoutMenuItem');
    const userName = document.getElementById('userName');
    const userStatus = document.getElementById('userStatus');
    const loginModal = document.getElementById('loginModal');
    const closeLoginModal = document.getElementById('closeLoginModal');
    const loginForm = document.getElementById('loginForm');
    const overlay = document.getElementById('overlay');
    const contentPanel = document.getElementById('contentPanel');
    const closePanel = document.getElementById('closePanel');
    const accessibilityBtn = document.getElementById('accessibilityBtn');
    const accessibilityPanel = document.getElementById('accessibilityPanel');
    const closeAccessibility = document.getElementById('closeAccessibility');
    const resetAccessibility = document.getElementById('resetAccessibility');
    const mainContent = document.getElementById('mainContent');
    const particleCanvas = document.getElementById('particleCanvas');
    const ctx = particleCanvas ? particleCanvas.getContext('2d') : null;

    // Partículas
    let particles = [];
    let mouseX = -9999, mouseY = -9999;
    const mouseRadius = 120;
    let isSidebarOpen = false;

    // Detectar si se abrió el HTML desde file:// (solo para info)
    const isFileProtocol = location.protocol === 'file:';

    // Iniciar app
    function initApp() {
        if (particleCanvas && ctx) {
            resizeCanvas();
            initParticles();
            requestAnimationFrame(animateParticles);
            window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
        }

        loadAccessibilitySettings();
        setupEventListeners();
        checkSavedUser();
        updateUserUI();
    }

    // Eventos UI
    function setupEventListeners() {
        if (menuToggle) menuToggle.addEventListener('click', e => { e.stopPropagation(); toggleSidebar(); });
        if (overlay) overlay.addEventListener('click', () => { closeAllPanels(); });
        if (sidebar) sidebar.addEventListener('click', e => e.stopPropagation());
        if (loginModal) loginModal.addEventListener('click', e => e.stopPropagation());
        if (contentPanel) contentPanel.addEventListener('click', e => e.stopPropagation());

        if (loginLink) loginLink.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggleSidebar(); showLoginForm(); });
        if (logoutLink) logoutLink.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); logout(); });
        if (closeLoginModal) closeLoginModal.addEventListener('click', e => { e.stopPropagation(); closeModal(loginModal); });
        if (closePanel) closePanel.addEventListener('click', e => { e.stopPropagation(); closeModal(contentPanel); });
        if (closeAccessibility) closeAccessibility.addEventListener('click', e => { e.stopPropagation(); closeModal(accessibilityPanel); });

        if (loginForm) loginForm.addEventListener('submit', async (e) => { e.preventDefault(); e.stopPropagation(); await onSubmitAuth(e); });

        if (accessibilityBtn) accessibilityBtn.addEventListener('click', e => { e.preventDefault(); openModal(accessibilityPanel); });
        if (resetAccessibility) resetAccessibility.addEventListener('click', e => { e.preventDefault(); resetAccessibilitySettings(); });

        if (particleCanvas) {
            particleCanvas.addEventListener('mousemove', e => {
                const rect = particleCanvas.getBoundingClientRect();
                mouseX = e.clientX - rect.left; mouseY = e.clientY - rect.top;
            });
            particleCanvas.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });
        }
    }

    function toggleSidebar() {
        if (!sidebar) return;
        isSidebarOpen = !isSidebarOpen;
        sidebar.classList.toggle('active', isSidebarOpen);
        if (overlay) overlay.classList.toggle('hidden', !isSidebarOpen);
    }

    function openModal(modal) {
        if (!modal) return;
        modal.classList.remove('hidden');
        if (overlay) overlay.classList.remove('hidden');
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.add('hidden');
        // ocultar overlay solo si no hay paneles abiertos
        const anyOpen = (sidebar && sidebar.classList.contains('active')) ||
            (loginModal && !loginModal.classList.contains('hidden')) ||
            (contentPanel && !contentPanel.classList.contains('hidden')) ||
            (accessibilityPanel && !accessibilityPanel.classList.contains('hidden'));
        if (!anyOpen && overlay) overlay.classList.add('hidden');
    }

    function closeAllPanels() {
        if (sidebar) sidebar.classList.remove('active'); isSidebarOpen = false;
        if (loginModal) loginModal.classList.add('hidden');
        if (contentPanel) contentPanel.classList.add('hidden');
        if (accessibilityPanel) accessibilityPanel.classList.add('hidden');
        if (overlay) overlay.classList.add('hidden');
    }

    // Formularios: mostrar login o registro
    function showLoginForm() {
        if (!loginForm) return;
        // remover campo nombre si existe
        const nameField = document.getElementById('fullNameField');
        if (nameField) nameField.remove();
        const header = document.querySelector('#loginModal .modal-header h2'); if (header) header.textContent = 'Iniciar Sesión';
        hideError('usernameError'); hideError('passwordError'); hideError('nameError');
        openModal(loginModal);
    }

    function showRegisterForm() {
        if (!loginForm) return;
        // agregar campo nombre si no existe
        if (!document.getElementById('fullNameField')) {
            const group = document.createElement('div'); group.className = 'form-group'; group.id = 'fullNameField';
            group.innerHTML = `<label for="fullName">Nombre completo</label><input id="fullName" name="fullName" type="text" required><div class="error-message" id="nameError"></div>`;
            const ref = document.getElementById('username');
            ref.parentNode.parentNode.insertBefore(group, ref.parentNode);
        }
        const header = document.querySelector('#loginModal .modal-header h2'); if (header) header.textContent = 'Crear Cuenta';
        hideError('usernameError'); hideError('passwordError'); hideError('nameError');
        openModal(loginModal);
    }

    function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

    function showError(id, msg) {
        const el = document.getElementById(id);
        if (!el) return; el.textContent = msg; el.style.display = 'block';
    }

    function hideError(id) { const el = document.getElementById(id); if (!el) return; el.textContent = ''; el.style.display = 'none'; }

    // Envío común: decide entre registro o login según presencia de fullName
    async function onSubmitAuth(e) {
        const fullNameEl = document.getElementById('fullName');
        if (fullNameEl) return await handleRegister(e);
        return await handleLogin(e);
    }

    // Login
    async function handleLogin(e) {
        const email = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const remember = document.getElementById('rememberMe') ? document.getElementById('rememberMe').checked : false;

        let hasError = false;
        if (!email || !isValidEmail(email)) { showError('usernameError','Ingresa un correo válido'); hasError = true; } else hideError('usernameError');
        if (!password) { showError('passwordError','Ingresa la contraseña'); hasError = true; } else hideError('passwordError');
        if (hasError) return;

        const btn = loginForm.querySelector('.login-btn'); const oldText = btn ? btn.textContent : null; if (btn) { btn.textContent = 'Iniciando...'; btn.disabled = true; }

        try {
            const payload = { correo: email, password: password };
            const res = await fetch(API_ENDPOINTS.login, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
            const text = await res.text(); let data; try { data = JSON.parse(text); } catch (err) { throw new Error('Respuesta inválida: '+text); }

            if (res.ok && data.success) {
                currentUser = data.user; if (remember && data.token) { localStorage.setItem('userToken', data.token); localStorage.setItem('currentUser', JSON.stringify(currentUser)); }
                updateUserUI(); document.getElementById('loginFeedback')?.classList.remove('hidden'); loginForm.classList.add('hidden');
                setTimeout(()=>{ closeModal(loginModal); setTimeout(()=>{ openModal(contentPanel); document.getElementById('loginFeedback')?.classList.add('hidden'); loginForm.classList.remove('hidden'); loginForm.reset(); if (btn) { btn.textContent = oldText; btn.disabled = false; } },300); },1200);
            } else {
                showError('passwordError', data.message || 'Credenciales incorrectas'); if (btn) { btn.textContent = oldText; btn.disabled = false; }
            }
        } catch (err) {
            console.error('Login error:', err); showError('passwordError','Error al conectar con la API'); if (btn) { btn.textContent = oldText; btn.disabled = false; }
        }
    }

    // Registro
    async function handleRegister(e) {
        const name = document.getElementById('fullName').value.trim();
        const email = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        let hasError = false;
        if (!name) { showError('nameError','Ingresa tu nombre'); hasError = true; } else hideError('nameError');
        if (!email || !isValidEmail(email)) { showError('usernameError','Ingresa un correo válido'); hasError = true; } else hideError('usernameError');
        if (!password || password.length < 6) { showError('passwordError','La contraseña debe tener al menos 6 caracteres'); hasError = true; } else hideError('passwordError');
        if (hasError) return;

        const btn = loginForm.querySelector('.login-btn'); const oldText = btn ? btn.textContent : null; if (btn) { btn.textContent = 'Creando...'; btn.disabled = true; }

        try {
            const payload = { nombre: name, correo: email, password: password };
            const res = await fetch(API_ENDPOINTS.register, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
            const text = await res.text(); let data; try { data = JSON.parse(text); } catch (err) { data = { success:false, message:'Respuesta inválida del servidor' }; }

            if (res.status === 201 && data.success) {
                alert('Cuenta creada correctamente. Inicia sesión para continuar.'); showLoginForm();
            } else {
                showError('usernameError', data.message || 'Error al crear la cuenta'); if (btn) { btn.textContent = oldText; btn.disabled = false; }
            }
        } catch (err) {
            console.error('Register error:', err); showError('usernameError','Error al conectar con la API'); if (btn) { btn.textContent = oldText; btn.disabled = false; }
        }
    }

    // Verificar token guardado
    async function checkSavedUser() {
        const token = localStorage.getItem('userToken');
        if (!token) return;
        try {
            const res = await fetch(API_ENDPOINTS.verify, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ token }) });
            const data = await res.json(); if (data.valid && data.user) { currentUser = data.user; updateUserUI(); } else { localStorage.removeItem('userToken'); localStorage.removeItem('currentUser'); }
        } catch (err) { console.warn('verify token failed', err); }
    }

    function updateUserUI() {
        if (!userName || !userStatus) return;
        if (currentUser) {
            userName.textContent = currentUser.nombre || currentUser.name || 'Usuario';
            userStatus.textContent = 'Sesión activa'; userStatus.style.color = '#2ecc71';
            if (loginMenuItem) loginMenuItem.classList.add('hidden'); if (logoutMenuItem) logoutMenuItem.classList.remove('hidden');
        } else {
            userName.textContent = 'Invitado'; userStatus.textContent = 'No has iniciado sesión'; userStatus.style.color = '#777';
            if (loginMenuItem) loginMenuItem.classList.remove('hidden'); if (logoutMenuItem) logoutMenuItem.classList.add('hidden');
        }
    }

    function logout() { currentUser = null; localStorage.removeItem('userToken'); localStorage.removeItem('currentUser'); updateUserUI(); closeModal(contentPanel); toggleSidebar(); }

    // Accesibilidad: tamaño de fuente y alto contraste
    function loadAccessibilitySettings() {
        const settings = JSON.parse(localStorage.getItem('accessibility') || '{}');
        if (settings.fontSize) document.documentElement.style.fontSize = settings.fontSize;
        if (settings.contrast) document.documentElement.classList.toggle('high-contrast', settings.contrast);
    }

    function saveAccessibilitySettings(settings) { localStorage.setItem('accessibility', JSON.stringify(settings)); }

    function resetAccessibilitySettings() { localStorage.removeItem('accessibility'); document.documentElement.style.fontSize = ''; document.documentElement.classList.remove('high-contrast'); }

    // Partículas
    function resizeCanvas() {
        if (!particleCanvas) return; particleCanvas.width = mainContent ? mainContent.offsetWidth : window.innerWidth; particleCanvas.height = mainContent ? mainContent.offsetHeight : window.innerHeight; }

    function initParticles() {
        if (!particleCanvas) return; particles = []; const count = Math.min(120, Math.floor((particleCanvas.width * particleCanvas.height) / 12000));
        for (let i = 0; i < count; i++) {
            particles.push({ x: Math.random()*particleCanvas.width, y: Math.random()*particleCanvas.height, size: Math.random()*2+0.5, vx: (Math.random()-0.5)*0.6, vy: (Math.random()-0.5)*0.6, color: `rgba(52,152,219,${Math.random()*0.6+0.2})` });
        }
    }

    function animateParticles() {
        if (!ctx || !particleCanvas) return; ctx.clearRect(0,0,particleCanvas.width, particleCanvas.height);
        // ligero desenfoque de fondo
        ctx.fillStyle = 'rgba(250,250,250,0.03)'; ctx.fillRect(0,0,particleCanvas.width, particleCanvas.height);
        for (let p of particles) {
            // interacción con mouse
            const dx = mouseX - p.x, dy = mouseY - p.y; const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < mouseRadius) { const force = (mouseRadius - dist)/mouseRadius; const angle = Math.atan2(dy,dx); p.x -= Math.cos(angle)*force*6; p.y -= Math.sin(angle)*force*6; }
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > particleCanvas.width) p.vx *= -1; if (p.y < 0 || p.y > particleCanvas.height) p.vy *= -1;
            ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fillStyle = p.color; ctx.fill();
        }
        // líneas entre partículas cercanas
        for (let i=0;i<particles.length;i++) for (let j=i+1;j<particles.length;j++) {
            const a = particles[i], b = particles[j]; const dx = a.x-b.x, dy = a.y-b.y; const d = Math.sqrt(dx*dx+dy*dy);
            if (d < 80) { ctx.strokeStyle = 'rgba(100,150,200,'+(0.6 - d/120)+')'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
        }
        requestAnimationFrame(animateParticles);
    }

    // Inicializar
    initApp();
});

        
        if (error) return;
        
        // Mostrar loading
        const submitBtn = loginForm.querySelector('.login-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Iniciando sesión...';
        submitBtn.disabled = true;
        
        try {
            const loginData = {
                correo: usernameInput,
                password: password
            };

            // Si estamos en file:// usamos fallback local (localStorage)
            if (isFileProtocol) {
                console.log('Usando login local (localStorage) con datos:', loginData);
                const stored = JSON.parse(localStorage.getItem('localAccounts') || '[]');
                const user = stored.find(u => u.correo === loginData.correo && u.password === loginData.password);
                if (user) {
                    const data = { success: true, user: { id: user.id, nombre: user.nombre, correo: user.correo }, token: null };
                    currentUser = data.user;
                    if (rememberMe) {
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                    updateUserUI();
                    document.getElementById('loginFeedback').classList.remove('hidden');
                    loginForm.classList.add('hidden');
                    setTimeout(() => { closeModal(loginModal); setTimeout(() => { openModal(contentPanel); document.getElementById('loginFeedback').classList.add('hidden'); loginForm.classList.remove('hidden'); loginForm.reset(); submitBtn.textContent = originalText; submitBtn.disabled = false; },300); },1500);
                    return;
                } else {
                    showError('passwordError', 'Credenciales locales incorrectas');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    return;
                }
            }

            console.log('Enviando login a:', API_ENDPOINTS.login, 'con datos:', loginData);

            const response = await fetch(API_ENDPOINTS.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            console.log('Respuesta status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('Respuesta data:', data);

            if (data.success) {
                // Login exitoso
                currentUser = data.user;
                
                // Guardar token y usuario
                if (rememberMe) {
                    localStorage.setItem('userToken', data.token);
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }
                
                // Actualizar UI
                updateUserUI();
                
                // Mostrar feedback de éxito
                document.getElementById('loginFeedback').classList.remove('hidden');
                loginForm.classList.add('hidden');
                
                // Cerrar modal y abrir contenido exclusivo
                setTimeout(() => {
                    closeModal(loginModal);
                    setTimeout(() => {
                        openModal(contentPanel);
                        document.getElementById('loginFeedback').classList.add('hidden');
                        loginForm.classList.remove('hidden');
                        loginForm.reset();
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    }, 300);
                }, 1500);
                
            } else {
                // Error en el login
                showError('passwordError', data.message || 'Credenciales incorrectas');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error en login:', error);
            showError('passwordError', 'Error de conexión con el servidor. Verifica que la API esté funcionando.');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
    
    async function handleRegister(e) {
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Validación
        let error = false;
        
        if (fullName === '') {
            showError('nameError', 'Por favor ingresa tu nombre completo');
            error = true;
        } else {
            hideError('nameError');
        }
        
        if (email === '' || !isValidEmail(email)) {
            showError('usernameError', 'Por favor ingresa un email válido');
            error = true;
        } else {
            hideError('usernameError');
        }
        
        if (password === '' || password.length < 6) {
            showError('passwordError', 'La contraseña debe tener al menos 6 caracteres');
            error = true;
        } else {
            hideError('passwordError');
        }
        
        if (error) return;
        
        // Mostrar loading
        const submitBtn = loginForm.querySelector('.login-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creando cuenta...';
        submitBtn.disabled = true;
        
        try {
            const registerData = {
                nombre: fullName,
                correo: email,
                password: password
            };
            
            console.log('Enviando registro a:', API_ENDPOINTS.register, 'con datos:', registerData);
            
            const response = await fetch(API_ENDPOINTS.register, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registerData)
            });

            console.log('Respuesta registro status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error('Error parseando respuesta JSON:', err);
                data = { success: false, message: 'Respuesta inválida del servidor' };
            }
            
            console.log('Respuesta registro data:', data);

            if (response.status === 201 && data.success) {
                // Registro exitoso
                alert('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.');
                showLoginForm();
            } else {
                // Error en el registro
                showError('usernameError', data.message || 'Error al crear la cuenta');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error en registro:', error);
            showError('usernameError', 'Error de conexión con el servidor. Verifica que la API esté funcionando.');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
    
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    function logout() {
        currentUser = null;
        localStorage.removeItem('userToken');
        localStorage.removeItem('currentUser');
        updateUserUI();
        closeModal(contentPanel);
        toggleSidebar();
        alert('Sesión cerrada exitosamente');
    }
    
    function updateUserUI() {
        if (currentUser) {
            userName.textContent = currentUser.nombre || currentUser.name || 'Usuario';
            userStatus.textContent = 'Sesión activa';
            userStatus.style.color = '#2ecc71';
            loginMenuItem.classList.add('hidden');
            logoutMenuItem.classList.remove('hidden');
        } else {
            userName.textContent = 'Invitado';
            userStatus.textContent = 'No has iniciado sesión';
            userStatus.style.color = '#777';
            loginMenuItem.classList.remove('hidden');
            logoutMenuItem.classList.add('hidden');
        }
    }
    
    function showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.style.display = 'block';
        element.style.color = '#e74c3c';
        element.style.fontSize = '0.9rem';
        element.style.marginTop = '5px';
    }
    
    function hideError(elementId) {
        const element = document.getElementById(elementId);
        element.textContent = '';
        element.style.display = 'none';
    }
    
    // Sistema de partículas
    function resizeCanvas() {
        particleCanvas.width = mainContent.offsetWidth;
        particleCanvas.height = mainContent.offsetHeight;
    }
    
    function initParticles() {
        particles = [];
        const particleCount = Math.min(100, Math.floor((particleCanvas.width * particleCanvas.height) / 10000));
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * particleCanvas.width,
                y: Math.random() * particleCanvas.height,
                size: Math.random() * 3 + 1,
                speedX: Math.random() * 1 - 0.5,
                speedY: Math.random() * 1 - 0.5,
                color: `rgba(52, 152, 219, ${Math.random() * 0.5 + 0.2})`
            });
        }
    }
    
    function animateParticles() {
        ctx.fillStyle = 'rgba(249, 249, 249, 0.05)';
        ctx.fillRect(0, 0, particleCanvas.width, particleCanvas.height);
        
        particles.forEach(particle => {
            const dx = mouseX - particle.x;
            const dy = mouseY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < mouseRadius) {
                const force = (mouseRadius - distance) / mouseRadius;
                const angle = Math.atan2(dy, dx);
                particle.x -= Math.cos(angle) * force * 8;
                particle.y -= Math.sin(angle) * force * 8;
            }
            
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            if (particle.x <= 0 || particle.x >= particleCanvas.width) particle.speedX *= -1;
            if (particle.y <= 0 || particle.y >= particleCanvas.height) particle.speedY *= -1;
            
            particle.x = Math.max(0, Math.min(particleCanvas.width, particle.x));
            particle.y = Math.max(0, Math.min(particleCanvas.height, particle.y));
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
            
            particles.forEach(otherParticle => {
                const pdx = particle.x - otherParticle.x;
                const pdy = particle.y - otherParticle.y;
                const pDistance = Math.sqrt(pdx * pdx + pdy * pdy);
                
                if (pDistance < 100) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(52, 152, 219, ${0.2 * (1 - pDistance/100)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(otherParticle.x, otherParticle.y);
                    ctx.stroke();
                }
            });
        });
        
        requestAnimationFrame(animateParticles);
    }
    
    // Sistema de accesibilidad
    function setupAccessibilityButtons() {
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                applyTextSize(this.getAttribute('data-size'));
            });
        });
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                applyTheme(this.getAttribute('data-theme'));
            });
        });
        
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                applyColorFilter(this.getAttribute('data-color'));
            });
        });
        
        document.querySelectorAll('.contrast-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.contrast-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                applyContrast(this.getAttribute('data-contrast'));
            });
        });
    }
    
    function applyTextSize(size) {
        document.body.classList.remove('small-text', 'large-text', 'xlarge-text');
        if (size !== 'medium') document.body.classList.add(`${size}-text`);
        saveAccessibilitySetting('textSize', size);
    }
    
    function applyTheme(theme) {
        document.body.classList.remove('dark-theme', 'light-theme');
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
        } else if (theme !== 'light') {
            document.body.classList.add(`${theme}-theme`);
        }
        saveAccessibilitySetting('theme', theme);
    }
    
    function applyColorFilter(color) {
        document.body.classList.remove('protanopia', 'deuteranopia', 'tritanopia');
        if (color !== 'normal') document.body.classList.add(color);
        saveAccessibilitySetting('colorFilter', color);
    }
    
    function applyContrast(contrast) {
        document.body.classList.remove('high-contrast', 'very-high-contrast');
        if (contrast !== 'normal') document.body.classList.add(`${contrast}-contrast`);
        saveAccessibilitySetting('contrast', contrast);
    }
    
    function resetAccessibilitySettings() {
        applyTextSize('medium');
        applyTheme('light');
        applyColorFilter('normal');
        applyContrast('normal');
        
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-size') === 'medium');
        });
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === 'light');
        });
        
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-color') === 'normal');
        });
        
        document.querySelectorAll('.contrast-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-contrast') === 'normal');
        });
        
        localStorage.removeItem('accessibilitySettings');
    }
    
    function saveAccessibilitySetting(key, value) {
        let settings = JSON.parse(localStorage.getItem('accessibilitySettings')) || {};
        settings[key] = value;
        localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
    }
    
    function loadAccessibilitySettings() {
        const settings = JSON.parse(localStorage.getItem('accessibilitySettings'));
        if (settings) {
            if (settings.textSize) applyTextSize(settings.textSize);
            if (settings.theme) applyTheme(settings.theme);
            if (settings.colorFilter) applyColorFilter(settings.colorFilter);
            if (settings.contrast) applyContrast(settings.contrast);
        }
    }
    
    // Cerrar con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (isSidebarOpen) toggleSidebar();
            if (!loginModal.classList.contains('hidden')) closeModal(loginModal);
            if (!contentPanel.classList.contains('hidden')) closeModal(contentPanel);
            if (!accessibilityPanel.classList.contains('hidden')) closeModal(accessibilityPanel);
        }
    });
});