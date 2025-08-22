const API = {
  register: "/api/auth/register",
  login: "/api/auth/login",
  me: "/api/auth/me",
  books: "/api/books"
};
const tokenKey = "lms_lilac_token";
const roleKey = "lms_lilac_role";
const nameKey = "lms_lilac_name";

const saveAuth = ({ token, role, name }) => {
  if (token) localStorage.setItem(tokenKey, token);
  if (role) localStorage.setItem(roleKey, role);
  if (name) localStorage.setItem(nameKey, name);
};
const getToken = () => localStorage.getItem(tokenKey);
const getRole = () => localStorage.getItem(roleKey);
const getName = () => localStorage.getItem(nameKey);

const authFetch = (url, options = {}) => {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: "Bearer " + token } : {})
    }
  });
};

// Register
const regForm = document.getElementById("registerForm");
if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(regForm).entries());
    const res = await fetch(API.register, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const out = await res.json();
    alert(res.ok ? "Registered! Now login." : out.message || "Error");
  });
}

// Login
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm).entries());
    const res = await fetch(API.login, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const out = await res.json();
    if (res.ok) {
      saveAuth({ token: out.token, role: out.role, name: out.name });
      document.getElementById("loginInfo").textContent = "Logged in as " + (out.name || "") + " (" + out.role + ")";
      alert("Logged in!");
      location.href = "/books.html";
    } else {
      alert(out.message || "Login error");
    }
  });
}

// Profile
const loadProfileBtn = document.getElementById("loadProfile");
if (loadProfileBtn) {
  loadProfileBtn.addEventListener("click", async () => {
    const res = await authFetch(API.me);
    const out = await res.json();
    document.getElementById("profileOut").textContent = JSON.stringify(out, null, 2);
  });
}

// Books
const booksList = document.getElementById("booksList");
const refreshBtn = document.getElementById("refreshBooks");
const adminSection = document.getElementById("adminSection");
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(roleKey);
    localStorage.removeItem(nameKey);
    alert("Logged out");
    location.href = "/";
  });
}

function showAdminSection() {
  if (!adminSection) return;
  adminSection.style.display = (getRole() === "admin") ? "block" : "none";
}
showAdminSection();

async function loadBooks() {
  if (!booksList) return;
  const res = await authFetch(API.books);
  if (!res.ok) {
    booksList.innerHTML = "<p class='muted'>Please login first.</p>";
    return;
  }
  const books = await res.json();
  booksList.innerHTML = "";
  books.forEach(b => {
    const div = document.createElement("div");
    div.className = "book";
    const badge = `<span class="badge">${b.availableCopies > 0 ? "Available" : "Out of stock"}</span>`;
    div.innerHTML = `<div><strong>${b.title}</strong> — ${b.author} <span class="muted">(${b.category})</span></div><div>${badge}</div>`;

    const actions = document.createElement("div");

    const borrowBtn = document.createElement("button");
    borrowBtn.textContent = "Borrow";
    borrowBtn.disabled = b.availableCopies <= 0;
    borrowBtn.onclick = async () => {
      const res = await authFetch(`/api/books/borrow/${b._id}`, { method: "POST" });
      const out = await res.json();
      alert(out.message || (res.ok ? "Borrowed" : "Error"));
      loadBooks();
    };
    actions.appendChild(borrowBtn);

    const returnBtn = document.createElement("button");
    returnBtn.textContent = "Return";
    returnBtn.onclick = async () => {
      const res = await authFetch(`/api/books/return/${b._id}`, { method: "POST" });
      const out = await res.json();
      alert(out.message || (res.ok ? "Returned" : "Error"));
      loadBooks();
    };
    actions.appendChild(returnBtn);

    if (getRole() === "admin") {
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.onclick = async () => {
        if (!confirm("Delete this book?")) return;
        const res = await authFetch(`/api/books/${b._id}`, { method: "DELETE" });
        const out = await res.json();
        alert(out.message || (res.ok ? "Deleted" : "Error"));
        loadBooks();
      };
      actions.appendChild(delBtn);
    }

    div.appendChild(actions);
    booksList.appendChild(div);
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener("click", loadBooks);
  loadBooks();
}

// Create book (admin)
const createBookForm = document.getElementById("createBookForm");
if (createBookForm) {
  createBookForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(createBookForm).entries());
    data.availableCopies = Number(data.availableCopies || 1);
    const res = await authFetch(API.books, { method: "POST", body: JSON.stringify(data) });
    const out = await res.json();
    alert(res.ok ? "Book created" : out.message || "Error");
    if (res.ok) (e.target).reset();
    loadBooks();
  });
}
