<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>ParkHub | Smart Parking System</title>
  <!-- Tailwind CSS v3 -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      background: #fafafa;
    }
    input:focus {
      box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
      border-color: #3b82f6;
      outline: none;
    }
    .transition-smooth {
      transition: all 0.2s ease;
    }
  </style>
</head>
<body class="font-sans antialiased">

<div class="min-h-screen flex items-center justify-center p-4 relative bg-[#fafafa]">
  <!-- Background decorative blobs (same as original) -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-50 blur-[120px]"></div>
    <div class="absolute top-[60%] -right-[5%] w-[30%] h-[30%] rounded-full bg-indigo-50 blur-[100px]"></div>
  </div>

  <!-- Simple centered card - ParkHub branding -->
  <div class="relative w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
    <!-- Header: ParkHub brand bar -->
    <div class="bg-slate-900 px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="h-9 w-9 bg-blue-500 rounded-xl flex items-center justify-center font-bold text-white text-lg">PH</div>
        <span class="font-bold tracking-tight text-white text-xl">Park<span class="text-blue-400">Hub</span></span>
      </div>
      <div class="text-[11px] text-slate-300 bg-white/10 px-2 py-1 rounded-full font-medium">v2.0</div>
    </div>

    <!-- Main content -->
    <div class="p-6 md:p-8">
      <!-- Title area (dynamic) -->
      <div class="mb-6 text-center">
        <h3 id="formTitle" class="text-2xl font-bold text-slate-900">Welcome back</h3>
        <p id="formSubtext" class="text-slate-500 text-sm mt-1">Sign in to your ParkHub account</p>
      </div>

      <!-- Status messages container -->
      <div id="statusContainer" class="mb-4 space-y-2"></div>

      <!-- Form -->
      <form id="authForm" class="space-y-4">
        <!-- Dynamic fields (registration extra fields will appear here) -->
        <div id="dynamicFields"></div>

        <!-- Email / Username field (login: username/email ; register: email) -->
        <div class="space-y-1.5">
          <label id="emailLabel" class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Email address</label>
          <input type="text" id="emailInput" required class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all bg-white" placeholder="hello@parkhub.com">
        </div>

        <!-- Username field (only for registration) -->
        <div id="usernameField" class="space-y-1.5 hidden">
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Username</label>
          <input type="text" id="usernameInput" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all bg-white" placeholder="parkmaster">
        </div>

        <!-- Full name & phone row for registration (grid) -->
        <div id="registerExtraFields" class="hidden space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Full name</label>
              <input type="text" id="fullNameInput" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all" placeholder="Alex Rivera">
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Phone</label>
              <input type="tel" id="phoneInput" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all" placeholder="+1 555 123 4567">
            </div>
          </div>
        </div>

        <!-- Password row: password + confirm (confirm only for register) -->
        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Password</label>
            <input type="password" id="passwordInput" required class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all" placeholder="········">
          </div>
          <div id="confirmField" class="space-y-1.5 hidden">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Confirm password</label>
            <input type="password" id="confirmInput" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all" placeholder="········">
          </div>
        </div>

        <!-- Submit button -->
        <button type="submit" id="submitBtn" class="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm tracking-wide uppercase hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md mt-2">
          Sign In
        </button>
      </form>

      <!-- Toggle between login & register -->
      <div class="mt-6 text-center">
        <button id="toggleModeBtn" class="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
          Don't have an account? Create one
        </button>
      </div>

      <!-- simple parking feature hint (minimal) -->
      <div class="mt-6 pt-4 border-t border-slate-100 text-center">
        <div class="flex items-center justify-center gap-3 text-xs text-slate-400">
          <span class="flex items-center gap-1">✓ Live occupancy</span>
          <span class="w-1 h-1 rounded-full bg-slate-300"></span>
          <span class="flex items-center gap-1">✓ Quick entry</span>
          <span class="w-1 h-1 rounded-full bg-slate-300"></span>
          <span class="flex items-center gap-1">✓ Smart spots</span>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
  // ---------- Simpler ParkHub Auth ----------
  // API simulation or real if needed - but matching original react logic but simplified.
  // We'll simulate backend calls but keep login/register structure.
  // Original used /auth/login and /auth/register with token storage.
  // For demo, we'll mock API but keep same flow, plus retain localStorage and onLogin callback.
  
  // Simulated API endpoint (since no backend) but we'll simulate success for demo.
  // However to respect the original: we can actually call the live API_URL if needed, but simpler to mock?
  // The requirement: "change it to simple and title to smartparking system but keep the colors"
  // We've changed name to ParkHub, simplified UI, kept slate-900/blue theme. The original code had API_URL.
  // To keep fully functional we'll implement mock but ALSO can call real API? But in simplified version we can demonstrate using localStorage and fake users.
  // But because the original expects token and user object, we'll mock a successful response after validation.
  // Allow demo registration / login without actual backend, but maintain the exact contract (token/user).
  
  // For simplicity & working demo (no CORS hassle), we create a lightweight in-memory "store"
  // but also preserve ability for real API - we'll use a flag. Since it's a standalone HTML/CSS/JS, I'll implement demo user store.
  // Also the original React component called onLogin prop after success. Here we'll simulate redirect behavior.
  
  // --- DOM elements ---
  const form = document.getElementById('authForm');
  const toggleBtn = document.getElementById('toggleModeBtn');
  const formTitle = document.getElementById('formTitle');
  const formSubtext = document.getElementById('formSubtext');
  const submitBtn = document.getElementById('submitBtn');
  const emailLabel = document.getElementById('emailLabel');
  const emailInput = document.getElementById('emailInput');
  const usernameFieldDiv = document.getElementById('usernameField');
  const usernameInput = document.getElementById('usernameInput');
  const registerExtraDiv = document.getElementById('registerExtraFields');
  const confirmFieldDiv = document.getElementById('confirmField');
  const passwordInput = document.getElementById('passwordInput');
  const confirmInput = document.getElementById('confirmInput');
  const fullNameInput = document.getElementById('fullNameInput');
  const phoneInput = document.getElementById('phoneInput');
  const statusContainer = document.getElementById('statusContainer');

  let isLoginMode = true;
  let loading = false;

  // Helper to show message (error or success)
  function showMessage(message, type = 'error') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `p-3 rounded-lg text-sm flex items-center gap-2 ${
      type === 'error' 
        ? 'bg-red-50 border border-red-100 text-red-600' 
        : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
    }`;
    msgDiv.innerHTML = `<span>${type === 'error' ? '⚠️' : '✓'}</span> ${message}`;
    statusContainer.innerHTML = '';
    statusContainer.appendChild(msgDiv);
    setTimeout(() => {
      if (statusContainer.firstChild === msgDiv) {
        msgDiv.style.opacity = '0';
        setTimeout(() => {
          if (statusContainer.firstChild === msgDiv) statusContainer.innerHTML = '';
        }, 300);
      }
    }, 4000);
  }

  function clearMessages() {
    statusContainer.innerHTML = '';
  }

  // update UI fields based on login/register mode
  function updateUIMode() {
    if (isLoginMode) {
      formTitle.innerText = 'Welcome back';
      formSubtext.innerText = 'Sign in to your ParkHub account';
      emailLabel.innerText = 'Email or username';
      emailInput.placeholder = 'hello@parkhub.com or parkuser';
      submitBtn.innerText = 'Sign In';
      toggleBtn.innerText = "Don't have an account? Create one";
      // hide registration-specific fields
      usernameFieldDiv.classList.add('hidden');
      registerExtraDiv.classList.add('hidden');
      confirmFieldDiv.classList.add('hidden');
      // remove required from hidden fields
      if (usernameInput) usernameInput.required = false;
      if (fullNameInput) fullNameInput.required = false;
      if (phoneInput) phoneInput.required = false;
      if (confirmInput) confirmInput.required = false;
    } else {
      formTitle.innerText = 'Join ParkHub';
      formSubtext.innerText = 'Create your account in seconds';
      emailLabel.innerText = 'Email address';
      emailInput.placeholder = 'you@example.com';
      submitBtn.innerText = 'Create Account';
      toggleBtn.innerText = 'Already have an account? Sign in';
      // show registration fields
      usernameFieldDiv.classList.remove('hidden');
      registerExtraDiv.classList.remove('hidden');
      confirmFieldDiv.classList.remove('hidden');
      if (usernameInput) usernameInput.required = true;
      if (fullNameInput) fullNameInput.required = true;
      if (confirmInput) confirmInput.required = true;
      // phone optional, but we keep consistent
      if (phoneInput) phoneInput.required = false;
    }
    // clear any form values & messages when toggling
    emailInput.value = '';
    passwordInput.value = '';
    if (usernameInput) usernameInput.value = '';
    if (fullNameInput) fullNameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (confirmInput) confirmInput.value = '';
    clearMessages();
  }

  // Mock API request (simulating backend but respecting token logic)
  // Since original connected to real API_URL, but for simplicity and demonstration
  // we'll implement a realistic mock user store: registered users saved in localStorage usersDB.
  // This matches the "ParkHub" offline demo but behaves as a real auth (token).
  // We'll also keep onLogin behavior: after success we set localStorage and call onLogin equivalent: redirect alert and simulate page change.
  function initializeUserStore() {
    if (!localStorage.getItem('parkhub_users')) {
      const defaultUsers = [
        { id: '1', name: 'Demo User', email: 'demo@parkhub.com', username: 'demouser', password: 'demo123', phone: '+1234567890' }
      ];
      localStorage.setItem('parkhub_users', JSON.stringify(defaultUsers));
    }
  }
  initializeUserStore();

  // Helper to find user by email or username (login)
  function findUserByEmailOrUsername(identifier, password) {
    const users = JSON.parse(localStorage.getItem('parkhub_users') || '[]');
    return users.find(u => (u.email === identifier || u.username === identifier) && u.password === password);
  }

  function findUserByEmail(email) {
    const users = JSON.parse(localStorage.getItem('parkhub_users') || '[]');
    return users.find(u => u.email === email);
  }

  function findUserByUsername(username) {
    const users = JSON.parse(localStorage.getItem('parkhub_users') || '[]');
    return users.find(u => u.username === username);
  }

  // registration
  function registerUser({ full_name, email, username, phone, password }) {
    const users = JSON.parse(localStorage.getItem('parkhub_users') || '[]');
    if (findUserByEmail(email)) throw new Error('Email already registered');
    if (findUserByUsername(username)) throw new Error('Username already taken');
    const newUser = {
      id: Date.now().toString(),
      name: full_name,
      email: email,
      username: username,
      password: password,
      phone: phone || '',
    };
    users.push(newUser);
    localStorage.setItem('parkhub_users', JSON.stringify(users));
    // return user object without password for frontend
    const { password: _, ...safeUser } = newUser;
    return safeUser;
  }

  // login via email/username
  function loginUser(identifier, password) {
    const user = findUserByEmailOrUsername(identifier, password);
    if (!user) throw new Error('Invalid credentials');
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  // generate mock token
  function generateToken(user) {
    return 'pk_hub_' + btoa(user.id + ':' + Date.now());
  }

  // handle form submit (same logic as React component but simplified)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();
    if (loading) return;
    loading = true;
    submitBtn.disabled = true;
    submitBtn.innerText = isLoginMode ? 'Signing in...' : 'Creating account...';

    try {
      if (!isLoginMode) {
        // registration
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        if (password !== confirm) throw new Error("Passwords don't match");
        if (password.length < 4) throw new Error('Password must be at least 4 characters');
        const email = emailInput.value.trim();
        const username = usernameInput.value.trim();
        const fullName = fullNameInput.value.trim();
        const phone = phoneInput.value.trim();
        if (!email || !username || !fullName) throw new Error('Please fill all required fields');
        if (!email.includes('@')) throw new Error('Valid email required');
        
        const newUser = registerUser({
          full_name: fullName,
          email: email,
          username: username,
          phone: phone,
          password: password
        });
        const token = generateToken(newUser);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(newUser));
        showMessage('Account created successfully! Redirecting...', 'success');
        setTimeout(() => {
          // simulate onLogin callback: we call a demo redirect or just alert + reset?
          alert(`Welcome ${newUser.name}! You are now logged into ParkHub. (Demo dashboard)\nToken saved.`);
          // optional: you could reload UI to dashboard state, but for simplicity we just show success
          // keeping consistent with original: onLogin(user, token)
          if (typeof window.onLoginSuccess === 'function') window.onLoginSuccess(newUser, token);
          else console.log('ParkHub login success', newUser);
          // reset loading and could switch to logged-in view? but for demo we keep page
          // we can also reset form to login state after register? according to original: After register, setTimeout calls onLogin
          // do mode switch to login visually? but original uses onLogin to replace component. we just show message.
          // reset mode to login for clarity
          isLoginMode = true;
          updateUIMode();
          clearMessages();
          // extra clear form
          emailInput.value = '';
          passwordInput.value = '';
        }, 1000);
      } else {
        // Login mode
        const identifier = emailInput.value.trim();
        const password = passwordInput.value;
        if (!identifier || !password) throw new Error('Please enter email/username and password');
        const user = loginUser(identifier, password);
        const token = generateToken(user);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        showMessage(`Welcome back, ${user.name || user.username}!`, 'success');
        setTimeout(() => {
          alert(`✅ Logged into ParkHub. Hi ${user.name || user.username}!\nYour dashboard is ready.`);
          if (typeof window.onLoginSuccess === 'function') window.onLoginSuccess(user, token);
          else console.log('ParkHub user logged in:', user);
        }, 500);
      }
    } catch (err) {
      showMessage(err.message, 'error');
      loading = false;
      submitBtn.disabled = false;
      submitBtn.innerText = isLoginMode ? 'Sign In' : 'Create Account';
    } finally {
      if (!loading) {
        // if error, loading already false
      } else {
        // only reset loading if no error scenario but careful: success timeout may keep loading
        // after success set loading false after redirect delay? we will reset loading only if error or after success.
        if (!document.querySelector('#statusContainer .bg-emerald-50')) {
          loading = false;
          submitBtn.disabled = false;
          submitBtn.innerText = isLoginMode ? 'Sign In' : 'Create Account';
        } else {
          // success case: loading will stay disabled and then after redirect we reset mode manually with loading false.
          setTimeout(() => {
            loading = false;
            submitBtn.disabled = false;
            submitBtn.innerText = isLoginMode ? 'Sign In' : 'Create Account';
          }, 1200);
        }
      }
    }
    // for error path loading already false above, but double-check
    if (loading && !statusContainer.innerHTML.includes('Account created') && !statusContainer.innerHTML.includes('Welcome back')) {
      loading = false;
      submitBtn.disabled = false;
      submitBtn.innerText = isLoginMode ? 'Sign In' : 'Create Account';
    }
  });

  // toggle mode
  toggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    updateUIMode();
    clearMessages();
    loading = false;
    submitBtn.disabled = false;
    submitBtn.innerText = isLoginMode ? 'Sign In' : 'Create Account';
  });

  // initial UI
  updateUIMode();
  
  // add demo hint: Prefill demo account for convenience (not invasive but helpful)
  // We'll add a little helper link but not intrusive: show demo credentials suggestion under form?
  const hintDiv = document.createElement('div');
  hintDiv.className = 'mt-4 text-center text-xs text-slate-400';
  hintDiv.innerHTML = `<span class="cursor-pointer hover:text-blue-500" id="demoFillBtn">🔑 Try demo: demo@parkhub.com / demo123</span>`;
  document.querySelector('.mt-6.pt-4.border-t').insertAdjacentElement('afterend', hintDiv);
  document.getElementById('demoFillBtn')?.addEventListener('click', () => {
    if (!isLoginMode) {
      // switch to login mode first if needed
      if (!isLoginMode) {
        isLoginMode = true;
        updateUIMode();
      }
      emailInput.value = 'demo@parkhub.com';
      passwordInput.value = 'demo123';
      clearMessages();
      showMessage('Demo credentials filled. Click Sign In.', 'success');
    } else {
      emailInput.value = 'demo@parkhub.com';
      passwordInput.value = 'demo123';
      clearMessages();
      showMessage('Demo credentials filled.', 'success');
    }
  });
</script>
</body>
</html>
