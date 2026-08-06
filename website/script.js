// ─── STICKY HEADER SCROLL REVEAL ───
window.onscroll = function() {
  const stickyHeader = document.getElementById('stickyHeader');
  if (stickyHeader) {
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
      stickyHeader.style.display = 'block';
    } else {
      stickyHeader.style.display = 'none';
    }
  }
};

// ─── SCROLL TO SECTION ───
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

// ─── THEME TOGGLE SWITCHER STATE (Dark Mode Default) ───
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeUI(newTheme);
}

function updateThemeUI(theme) {
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    const sunIcon = btn.querySelector('.sun-icon');
    const moonIcon = btn.querySelector('.moon-icon');
    if (sunIcon && moonIcon) {
      if (theme === 'light') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      }
    }
  });
}

// ─── BACKGROUND PARTICLES CANVAS ANIMATION ───
function initParticlesCanvas() {
  const canvas = document.getElementById('codexParticlesCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = Math.min(Math.floor(width / 25), 45);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 140) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(139, 92, 246, ${(1 - dist / 140) * 0.15})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// ─── PRODUCT CATALOG LIVE FETCHING ───
let productsList = [];
async function loadFeaturedProducts() {
  const track = document.getElementById('featuredProductsTrack');
  if (!track) return;
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success && data.products) {
      productsList = data.products;
      renderFeaturedProducts();
    } else {
      track.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; width: 100%;">No products available at the moment.</div>';
    }
  } catch (err) {
    console.error('Failed to load featured products:', err);
    track.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; width: 100%;">Error loading store catalogue. Please refresh.</div>';
  }
}

function renderFeaturedProducts() {
  const track = document.getElementById('featuredProductsTrack');
  if (!track) return;
  track.innerHTML = '';
  
  const featured = productsList.slice(0, 8);
  
  if (featured.length === 0) {
    track.innerHTML = '<div style="color: var(--text-secondary); padding: 40px; text-align: center; width: 100%;">No products currently in stock.</div>';
    return;
  }

  featured.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const escapedName = p.name.replace(/'/g, "\\'");
    card.innerHTML = `
      <span class="product-badge">Daily Fresh</span>
      <img class="product-card-img" src="${p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80'}" alt="${p.name}">
      <div class="product-card-brand">${p.category}</div>
      <div class="product-card-name">${p.name}</div>
      <div class="product-card-weight">${p.unit}</div>
      <div class="product-card-footer">
        <div class="product-card-price">₹${p.price}</div>
        <button class="btn-add" onclick="addProductToCart(${p.id}, '${escapedName}', ${p.price}, '${p.unit}')">Add</button>
      </div>
    `;
    track.appendChild(card);
  });
}

// ─── CART STATE MANAGEMENT ───
let cart = {}; // product_id -> { name, price, qty, unit }

function loadCartFromStorage() {
  const saved = localStorage.getItem('localCart');
  if (saved) {
    try {
      cart = JSON.parse(saved);
    } catch (e) {
      cart = {};
    }
  }
  updateCartUI();
}

function addProductToCart(id, name, price, unit) {
  if (cart[id]) {
    cart[id].qty += 1;
  } else {
    cart[id] = { name, price: parseFloat(price), qty: 1, unit };
  }
  localStorage.setItem('localCart', JSON.stringify(cart));
  updateCartUI();
  toggleCartDrawer(true);
}

function updateCartItemQty(id, diff) {
  if (!cart[id]) return;
  cart[id].qty += diff;
  if (cart[id].qty <= 0) {
    delete cart[id];
  }
  localStorage.setItem('localCart', JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI() {
  const items = Object.values(cart);
  const totalCount = items.reduce((acc, x) => acc + x.qty, 0);
  const totalPrice = items.reduce((acc, x) => acc + (x.price * x.qty), 0);

  const headerCount = document.getElementById('headerCartCount');
  const stickyCount = document.getElementById('stickyCartCount');
  if (headerCount) headerCount.innerText = totalCount;
  if (stickyCount) stickyCount.innerText = totalCount;

  const drawerItemsBox = document.getElementById('cartDrawerItems');
  const drawerTotal = document.getElementById('cartDrawerTotal');

  if (!drawerItemsBox || !drawerTotal) return;

  if (items.length === 0) {
    drawerItemsBox.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px 0;">Your cart is empty.</div>';
    drawerTotal.innerText = '₹0.00';
    return;
  }

  drawerItemsBox.innerHTML = '';
  Object.keys(cart).forEach(id => {
    const item = cart[id];
    const div = document.createElement('div');
    div.className = 'cart-drawer-item';
    div.innerHTML = `
      <div class="cart-drawer-item-details">
        <div class="cart-drawer-item-name">${item.name}</div>
        <div class="cart-drawer-item-price">₹${item.price} / ${item.unit}</div>
      </div>
      <div class="cart-drawer-item-qty">
        <button onclick="updateCartItemQty(${id}, -1)">-</button>
        <span>${item.qty}</span>
        <button onclick="updateCartItemQty(${id}, 1)">+</button>
      </div>
    `;
    drawerItemsBox.appendChild(div);
  });

  drawerTotal.innerText = `₹${totalPrice.toFixed(2)}`;
}

function toggleCartDrawer(open) {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (drawer && overlay) {
    if (open) {
      drawer.classList.add('active');
      overlay.classList.add('active');
    } else {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
    }
  }
}

function proceedToCheckout() {
  window.location.href = `/vegetables-fruits?customerId=15556349916&orderId=N2D10001`;
}

// ─── LOCATION SELECTION MODAL ───
function openLocationModal() {
  const modal = document.getElementById('locationModal');
  const errorDiv = document.getElementById('locationError');
  if (modal) modal.classList.add('active');
  if (errorDiv) errorDiv.style.display = 'none';
}

function closeLocationModal() {
  const modal = document.getElementById('locationModal');
  if (modal) modal.classList.remove('active');
}

function selectLocation(name) {
  const heroLocationInput = document.getElementById('heroLocationText');
  const stickyLocationSpan = document.getElementById('stickyLocationText');
  const stickyLocationMobile = document.getElementById('stickyLocationTextMobile');
  
  if (heroLocationInput) heroLocationInput.value = name;
  if (stickyLocationSpan) stickyLocationSpan.innerText = name;
  if (stickyLocationMobile) stickyLocationMobile.innerText = name;
  
  localStorage.setItem('selectedLocation', name);
  closeLocationModal();
}

function handleLocationSearch(e) {
  const query = e.target.value.toLowerCase();
  const errorDiv = document.getElementById('locationError');
  if (!errorDiv) return;
  
  const supported = ['bhongir', 'yadadri', 'hyderabad', 'telangana'];
  let isSupported = false;
  
  supported.forEach(s => {
    if (query.includes(s) || s.includes(query)) {
      isSupported = true;
    }
  });

  if (query && !isSupported) {
    errorDiv.style.display = 'block';
  } else {
    errorDiv.style.display = 'none';
  }
}

function detectUserLocation() {
  const modalBtn = document.querySelector('.modal-detect-btn');
  if (!modalBtn) return;
  modalBtn.innerText = 'Detecting Location...';
  
  setTimeout(() => {
    modalBtn.innerText = '🎯 Detect Current Location';
    selectLocation('Bhongir, Telangana');
  }, 1200);
}

// ─── PROMO CODE CLIPBOARD COPY ───
function copyPromoCode(element, code) {
  navigator.clipboard.writeText(code).then(() => {
    const originalText = element.innerText;
    element.innerText = 'COPIED!';
    element.style.background = 'var(--accent-green)';
    element.style.color = '#fff';
    element.style.borderColor = 'var(--accent-green)';
    
    setTimeout(() => {
      element.innerText = originalText;
      element.style.background = '';
      element.style.color = '';
      element.style.borderColor = '';
    }, 2000);
  }).catch(err => {
    console.error('Could not copy text: ', err);
  });
}

// ─── HOMEPAGE FILTER SEARCH ───
function handleSearchInput(e) {
  const query = e.target.value.toLowerCase();
  const cards = document.querySelectorAll('#featuredProductsTrack .product-card');
  cards.forEach(card => {
    const name = card.querySelector('.product-card-name').innerText.toLowerCase();
    const brand = card.querySelector('.product-card-brand').innerText.toLowerCase();
    if (name.includes(query) || brand.includes(query)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// ─── INITIALIZATION ───
async function init() {
  initTheme();
  initParticlesCanvas();
  await loadFeaturedProducts();
  loadCartFromStorage();
  
  const cachedLocation = localStorage.getItem('selectedLocation') || 'Bhongir, Telangana';
  selectLocation(cachedLocation);
}

document.addEventListener('DOMContentLoaded', init);
