// Apply saved theme immediately
(function() {
  try {
    const saved = localStorage.getItem('ikies_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  } catch (_) {}
})();

/**
 * Base Component class demonstrating Abstraction and Encapsulation
 */
class Component {
  constructor(selector) {
    this.element = document.querySelector(selector);
    if (!this.element) {
      console.warn(`Element with selector "${selector}" not found.`);
    }
  }

  // Abstract method to be overridden
  init() {
    throw new Error('init() must be implemented by subclasses');
  }
}

/**
 * Navbar Component demonstrating Inheritance
 */
class Navbar extends Component {
  constructor(selector) {
    super(selector);
    this.toggleButton = this.element?.querySelector('.menu-toggle');
    this.navLinks = this.element?.querySelector('.nav-links');
  }

  init() {
    if (this.toggleButton && this.navLinks) {
      this.toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.navLinks.classList.toggle('show');
      });

      // Close menu when clicking any nav link
      this.navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          this.navLinks.classList.remove('show');
        });
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!this.element.contains(e.target)) {
          this.navLinks.classList.remove('show');
        }
      });
    }
  }
}

/**
 * ImageSlider Component demonstrating Encapsulation
 */
class ImageSlider extends Component {
  constructor(selector) {
    super(selector);
    this.slides = this.element ? this.element.querySelectorAll('.slide') : [];
    this.current = 0;
    this.intervalId = null;
    window.__heroImageSlider = this;
  }

  updateSlides() {
    this.stopSlider();
    this.slides = this.element ? this.element.querySelectorAll('.slide') : [];
    this.current = 0;
    if (this.slides.length > 0) {
      this.slides.forEach((s, idx) => {
        if (idx === 0) s.classList.add('active');
        else s.classList.remove('active');
      });
      if (this.slides.length > 1) {
        this.startSlider();
      }
    }
  }

  init() {
    if (this.slides.length > 1) {
      this.startSlider();
    }
  }

  showNextSlide() {
    if (!this.slides || this.slides.length <= 1) return;
    this.slides[this.current].classList.remove('active');
    this.current = (this.current + 1) % this.slides.length;
    this.slides[this.current].classList.add('active');
  }

  startSlider() {
    if (!this.slides || this.slides.length <= 1) return;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.showNextSlide(), 5000);
  }

  stopSlider() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * CartManager handles shopping cart logic with localStorage
 */
class CartManager {
  constructor() {
    this.cartKey = 'ikies_cart';
    this.items = this.loadCart();
  }

  loadCart() {
    const data = localStorage.getItem(this.cartKey);
    return data ? JSON.parse(data) : [];
  }

  saveCart() {
    localStorage.setItem(this.cartKey, JSON.stringify(this.items));
    this.updateCartBadge();
  }

  addItem(name, quantity) {
    const qty = parseInt(quantity, 10) || 1;
    const existing = this.items.find(item => item.name === name);
    if (existing) {
      existing.quantity += qty;
    } else {
      this.items.push({ name, quantity: qty });
    }
    this.saveCart();
    alert(`${qty} adet "${name}" sepete eklendi.`);
  }

  removeItem(index) {
    this.items.splice(index, 1);
    this.saveCart();
    // Dispatch custom event so cart page can re-render
    window.dispatchEvent(new Event('cartUpdated'));
  }

  clearCart() {
    this.items = [];
    this.saveCart();
    window.dispatchEvent(new Event('cartUpdated'));
  }

  getTotalItems() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      badge.textContent = this.getTotalItems();
      badge.style.display = this.getTotalItems() > 0 ? 'inline-block' : 'none';
    }
  }
}

/**
 * BackdropAnimation Component creates a dark geometric constellation network
 */
class BackdropAnimation {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.zIndex = '-1';
    this.canvas.style.opacity = '0.5';
    this.canvas.style.pointerEvents = 'none';
    
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.nodeCount = window.innerWidth < 768 ? 40 : 80;
    
    document.body.insertBefore(this.canvas, document.body.firstChild);
    this.element = this.canvas; // Satisfies PageController requirement
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    for(let i = 0; i < this.nodeCount; i++) {
      this.nodes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.5 + 0.5
      });
    }
    
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = '#e63946'; // Bright accent-red
    this.ctx.strokeStyle = '#e63946';
    
    for(let i = 0; i < this.nodeCount; i++) {
      const node = this.nodes[i];
      node.x += node.vx;
      node.y += node.vy;
      
      if(node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
      if(node.y < 0 || node.y > this.canvas.height) node.vy *= -1;
      
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      for(let j = i + 1; j < this.nodeCount; j++) {
        const node2 = this.nodes[j];
        const dist = Math.hypot(node.x - node2.x, node.y - node2.y);
        
        if(dist < 150) {
          this.ctx.beginPath();
          this.ctx.moveTo(node.x, node.y);
          this.ctx.lineTo(node2.x, node2.y);
          this.ctx.globalAlpha = 1 - (dist / 150);
          this.ctx.stroke();
          this.ctx.globalAlpha = 1.0;
        }
      }
    }
    
    requestAnimationFrame(() => this.animate());
  }
}

// Global cart instance
window.cart = new CartManager();

/**
 * Default product catalog matching the database state
 */
const DEFAULT_PRODUCTS = [
  {
    id: 8,
    name: "Termoplastik De-icing",
    description: "Ekstrem hava koşulları için özel olarak geliştirilmiş Termoplastik De-icing sistemimiz, uygulanacak antenin birebir formunu alacak şekilde rölyef kalıplarla üretilmektedir. Yaklaşık 2mm et kalınlığı sayesinde dış darbelere, donmaya ve aşınmaya karşı inanılmaz bir mukavemet sunar. Uzun yıllar bakım gerektirmeden çalışabilmesi için yüksek kaliteli polimerik malzemeler kullanılmıştır.",
    image_url: "images/8ddeb8e2-a34c-4172-a97f-a9b6242e1bf6.jpg",
    images: [],
    parent_id: null,
    manual_url: null
  },
  {
    id: 9,
    name: "Ped De-icing",
    description: "Sac antenler için tasarladığımız yenilikçi Ped De-icing sistemimiz, arkası yapışkanlı ve pratik bir yapıya sahiptir. Antenin arka yüzeyine kolayca yapıştırılarak uygulanır ve üzeri izolasyon sağlayan çamur bant ile tamamen kapatılır. Isıtıcı ped, anten yüzeyi ile doğrudan fiziksel temas halinde olduğu için ısıyı minimum kayıpla metale aktarır, böylece hem çok hızlı hem de son derece enerji tasarruflu bir buz çözme deneyimi sunar.",
    image_url: "images/panel.bmp",
    images: [],
    parent_id: null,
    manual_url: null
  },
  {
    id: 10,
    name: "Sensör X",
    description: "Modern endüstriyel tesislerin dijitalleşmesine öncülük eden Sensör X, sahadaki donanımlarınızı masaüstünüze taşıyor. RS485 haberleşme protokolü kullanan bu modül, işletmenizdeki ana bilgisayarlara bağlanarak fiziksel panoların sanal ortamdan izlenmesine ve yönetilmesine olanak tanır. Gerçek zamanlı veri akışı ve güvenli iletişim altyapısı ile merkezi kontrol merkezleri için vazgeçilmez bir araçtır.",
    image_url: "images/IMG_2004.JPG",
    images: [],
    parent_id: null,
    manual_url: null
  },
  {
    id: 11,
    name: "Sensör 5",
    description: "Şebeke voltajı ile çalışabilen Sensör 5, 20 ampere kadar güçlü ve stabil kontrol sağlayan gelişmiş bir pano modülüdür. Yüksek akım ihtiyacı olan sistemlerde, sensörler ve kontrol elemanları kolaylıkla ek panolara taşınabilir. Bu esnek mimari sayesinde kurulumu ve bakımı son derece kolaydır. Aşırı yük koruması ve dalgalanmalara karşı entegre güvenlik sistemleri ile donatılmıştır.",
    image_url: "images/fotograf-0802.jpg",
    images: [],
    parent_id: null,
    manual_url: null
  },
  {
    id: 12,
    name: "Radom De-icing",
    description: "Anten yapısına tam uyumlu şekilde, özel dikiş teknikleri kullanılarak yan çeperden sarılan Radom De-icing sistemimiz, antenleri kar, buz ve şiddetli rüzgara karşı korumak için tasarlanmıştır. Genelde spesifik ebatlar ve projeler için özel olarak ölçülendirilir. Radom içerisindeki sıcaklığı stabilize ederek sinyal kaybını sıfıra indirir.",
    image_url: "images/IMG_3694.JPG",
    images: [],
    parent_id: null,
    manual_url: null
  },
  {
    id: 13,
    name: "Branda De-icing",
    description: "Çift yüz silikon kaplı ve çapraz cam elyaf dokumalı özel yapısıyla Branda De-icing, standart dışı anten boyutları için esnek ve pratik bir çözüm sunar. İstenilen her ebatta üretilebilen bu özel dokuma sistem, ısıyı yüzeye eşit oranda yayarak antenin ön yüzeyinde buzlanmayı engeller. Yüksek rüzgar ve zorlu hava koşullarına karşı ekstra direnç gösterecek şekilde güçlendirilmiştir.",
    image_url: "images/DSC04211.JPG",
    images: [],
    parent_id: null,
    manual_url: null
  },
  {
    id: 14,
    name: "Sensör D",
    description: "Doğal afet anlarında saniyeler bile hayati önem taşır. Sensör D; deprem, yangın, sel gibi acil durumlarda mekanlarda erken uyarı vermek ve sistem enerjisini güvenli bir şekilde kesmek üzere tasarlanmış akıllı bir sensör modülüdür. Gelişmiş sismik algılama algoritmaları sayesinde yanlış alarmları önler ve gerçek risk anlarında devreye girerek olası yangın ve elektrik hasarlarının önüne geçer.",
    image_url: "images/IMG_3723.JPG",
    images: [],
    parent_id: null,
    manual_url: null
  },
  {
    id: 15,
    name: "Blower De-icing",
    description: "Zorlu kış şartlarında TV ve uydu yayınlarının kesintiye uğramasını önlemek için geliştirilmiş yenilikçi sistemimizdir. Blower De-icing, antenin arka yüzeyine monte edilen yüksek kapasiteli fanlar (blower) yardımıyla, üretilen sıcak havanın anten çeperlerinde sürekli sirkülasyonunu sağlar. Bu sayede kar ve buz birikimi oluşmadan engellenir ve antenin sinyal iletkenliği her koşulda güvence altına alınır.",
    image_url: "images/DSC04173.JPG",
    images: [],
    parent_id: null,
    manual_url: null
  },
  {
    id: 16,
    name: "Sensor XA",
    description: "Test ve optimizasyon çalışmaları için modüler olarak tasarlanmış yüksek duyarlılığa sahip ikincil sensör modülü.",
    image_url: "images/e581dac21d9b414fac9b37402bde72a2.JPG",
    images: [],
    parent_id: 10,
    manual_url: null
  },
  {
    id: 17,
    name: "Sensor Manual",
    description: "Entegre teknik kılavuzu ve RS485 haberleşme dokümantasyonu bulunan akıllı kontrol ünitesi.",
    image_url: "images/e846771abfab4955af93ce6185f0ccdf.JPG",
    images: [],
    parent_id: 11,
    manual_url: "images/0673ebaecf1149dfaec5cd7af5f1ba6e.pdf"
  }
];

/**
 * IndexedDB storage engine for virtually unlimited client-side storage (hundreds of MBs vs 5MB in localStorage)
 */
const IdbStorage = {
  dbPromise: null,
  getDb() {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        if (typeof window === 'undefined' || !('indexedDB' in window)) {
          resolve(null);
          return;
        }
        // Safety timeout in case Safari blocks/hangs on file:// protocol
        const timer = setTimeout(() => resolve(null), 350);
        try {
          const req = window.indexedDB.open('ikies_db', 1);
          req.onblocked = () => {
            clearTimeout(timer);
            resolve(null);
          };
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('keyval')) {
              db.createObjectStore('keyval');
            }
          };
          req.onsuccess = (e) => {
            clearTimeout(timer);
            resolve(e.target.result);
          };
          req.onerror = () => {
            clearTimeout(timer);
            resolve(null);
          };
        } catch (e) {
          clearTimeout(timer);
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  },
  async get(key) {
    try {
      const db = await Promise.race([
        this.getDb(),
        new Promise(resolve => setTimeout(() => resolve(null), 350))
      ]);
      if (!db) return null;
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), 350);
        try {
          const tx = db.transaction('keyval', 'readonly');
          const store = tx.objectStore('keyval');
          const req = store.get(key);
          req.onsuccess = () => {
            clearTimeout(timer);
            resolve(req.result !== undefined ? req.result : null);
          };
          req.onerror = () => {
            clearTimeout(timer);
            resolve(null);
          };
        } catch (e) {
          clearTimeout(timer);
          resolve(null);
        }
      });
    } catch (e) {
      return null;
    }
  },
  async set(key, val) {
    try {
      const db = await Promise.race([
        this.getDb(),
        new Promise(resolve => setTimeout(() => resolve(null), 350))
      ]);
      if (!db) return false;
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), 500);
        try {
          const tx = db.transaction('keyval', 'readwrite');
          const store = tx.objectStore('keyval');
          const req = store.put(val, key);
          req.onsuccess = () => {
            clearTimeout(timer);
            resolve(true);
          };
          req.onerror = () => {
            clearTimeout(timer);
            resolve(false);
          };
        } catch (e) {
          clearTimeout(timer);
          resolve(false);
        }
      });
    } catch (e) {
      return false;
    }
  },
  async delete(key) {
    try {
      const db = await Promise.race([
        this.getDb(),
        new Promise(resolve => setTimeout(() => resolve(null), 350))
      ]);
      if (!db) return;
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').delete(key);
    } catch (e) {}
  }
};

/**
 * Converts an image file to a lightweight, high-clarity Data URL (max 1200px, JPEG ~60KB).
 * Uses Canvas toDataURL synchronously without WebKit Blob bugs or memory limits.
 */
function imageToDataUrl(file, maxDimension = 1200, quality = 0.78) {
  return new Promise((resolve) => {
    if (!file) {
      resolve(null);
      return;
    }
    // If not an image (e.g. PDF manual) or SVG, read with FileReader directly
    if (!file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
      return;
    }

    // Process via Canvas
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      const cleanup = () => {
        try { URL.revokeObjectURL(objectUrl); } catch (e) {}
      };

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            canvas.width = 0;
            canvas.height = 0;
            cleanup();
            resolve(dataUrl);
            return;
          }
        } catch (canvasErr) {
          console.warn("Canvas compression failed, falling back to FileReader:", canvasErr);
        }
        cleanup();
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve('images/placeholder.svg');
        reader.readAsDataURL(file);
      };

      img.onerror = () => {
        cleanup();
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve('images/placeholder.svg');
        reader.readAsDataURL(file);
      };

      img.src = objectUrl;
    } catch (e) {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.onerror = () => resolve('images/placeholder.svg');
      reader.readAsDataURL(file);
    }
  });
}

const compressImage = imageToDataUrl;

/**
 * Compresses an image File/Blob on client-side before uploading.
 * Returns a lightweight compressed File (usually 100-250KB instead of 5-15MB)
 */
function compressImageFile(file, maxDimension = 1400, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      resolve(file); // Non-images or SVGs or PDFs are left intact
      return;
    }
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      const cleanup = () => { try { URL.revokeObjectURL(objectUrl); } catch (_) {} };

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
              cleanup();
              if (blob && blob.size < file.size) {
                const safeName = (file.name || 'image.jpg').replace(/\.[^.]+$/, '.jpg');
                const compressedFile = new File([blob], safeName, { type: 'image/jpeg' });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            }, 'image/jpeg', quality);
            return;
          }
        } catch (canvasErr) {
          console.warn("Client pre-compression error, using original file:", canvasErr);
        }
        cleanup();
        resolve(file);
      };

      img.onerror = () => {
        cleanup();
        resolve(file);
      };

      img.src = objectUrl;
    } catch (_) {
      resolve(file);
    }
  });
}

let __detectedApiPrefix = null;

/**
 * Helper to query API with candidate fallback URLs to support cPanel Apache configurations
 */
async function apiFetch(endpoint, options = {}, timeoutMs = 15000) {
  // If running locally via file:// protocol, there is no server-side PHP API
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return null;
  }

  let clean = endpoint.replace(/^\/?api\//, '');
  const queryParams = [];

  // Parse any existing query parameters from the endpoint
  if (clean.includes('?')) {
    const parts = clean.split('?');
    clean = parts[0];
    const existingParams = parts.slice(1).join('&');
    if (existingParams) queryParams.push(existingParams);
  }

  // Attach auth token as query parameter as well to defeat any header stripping in Apache/PHP-FPM
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  if (token) {
    queryParams.push(`token=${encodeURIComponent(token)}`);
  }

  const requestedMethod = (options.method || 'GET').toUpperCase();
  // Tunnel PUT/DELETE through POST with _method parameter to bypass Apache/cPanel verb restrictions
  let actualMethod = requestedMethod;
  if (requestedMethod === 'PUT' || requestedMethod === 'DELETE') {
    actualMethod = 'POST';
    queryParams.push(`_method=${requestedMethod}`);
  }

  const queryString = queryParams.length > 0 ? queryParams.join('&') : '';

  // Prepare headers
  const headers = new Headers(options.headers || {});
  if (token) {
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('X-Authorization')) headers.set('X-Authorization', `Bearer ${token}`);
    if (!headers.has('X-Admin-Token')) headers.set('X-Admin-Token', token);
  }
  if (requestedMethod === 'PUT' || requestedMethod === 'DELETE') {
    headers.set('X-HTTP-Method-Override', requestedMethod);
  }

  const baseReqOptions = {
    ...options,
    method: actualMethod,
    headers
  };

  const isFrontendSubdir = typeof window !== 'undefined' && window.location.pathname.includes('/frontend');
  const candidateTemplates = isFrontendSubdir ? [
    '../backend_php/api.php?request={clean}',
    '/backend_php/api.php?request={clean}',
    'backend_php/api.php?request={clean}',
    '../api.php?request={clean}',
    'api.php?request={clean}',
    '/api/{clean}',
    'api/{clean}'
  ] : [
    'backend_php/api.php?request={clean}',
    '/backend_php/api.php?request={clean}',
    '../backend_php/api.php?request={clean}',
    'api.php?request={clean}',
    'api/api.php?request={clean}',
    '/api/{clean}',
    'api/{clean}'
  ];

  const orderedTemplates = __detectedApiPrefix 
    ? [__detectedApiPrefix, ...candidateTemplates.filter(t => t !== __detectedApiPrefix)]
    : candidateTemplates;

  for (const template of orderedTemplates) {
    let url;
    if (template.includes('?')) {
      url = template.replace('{clean}', clean) + (queryString ? '&' + queryString : '');
    } else {
      url = template.replace('{clean}', clean) + (queryString ? '?' + queryString : '');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const reqOptions = { ...baseReqOptions, signal: controller.signal };
      const res = await fetch(url, reqOptions);
      clearTimeout(timeoutId);

      // If server returned 404 or 405, this candidate path does not exist on this server
      if (res.status === 404 || res.status === 405) {
        continue;
      }

      __detectedApiPrefix = template;
      return res;
    } catch (err) {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * ProductService manages products seamlessly across API, IndexedDB, and LocalStorage fallback
 */
class ProductService {
  constructor() {
    this.storageKey = 'ikies_products';
    this._cachedProducts = null;
  }

  getLocalProducts() {
    if (this._cachedProducts && Array.isArray(this._cachedProducts) && this._cachedProducts.length > 0) {
      return this._cachedProducts;
    }
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this._cachedProducts = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read products from localStorage:", e);
    }
    this.saveLocalProducts(DEFAULT_PRODUCTS);
    return DEFAULT_PRODUCTS;
  }

  async saveLocalProducts(products) {
    this._cachedProducts = products;
    // Always persist to IndexedDB asynchronously (virtually unlimited quota)
    try {
      await IdbStorage.set(this.storageKey, products);
    } catch (err) {
      console.warn("Could not save products to IndexedDB:", err);
    }
    // Also try saving to localStorage as sync fallback
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(products));
    } catch (e) {
      console.info("LocalStorage quota exceeded; data is safely preserved in IndexedDB.");
    }
  }

  async getAll() {
    // Only attempt network API / static fetch if not on file:// protocol
    if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
      try {
        const res = await apiFetch('products', {}, 8000);
        if (res && res.ok) {
          const products = await res.json();
          if (Array.isArray(products) && products.length > 0) {
            await this.saveLocalProducts(products);
            return products;
          }
        }
      } catch (err) {
        console.info("Using local product catalog (Backend offline or static mode).");
      }

      // Static fallback to site_data.json
      try {
        const staticCandidates = ['data/site_data.json', '/data/site_data.json', '../data/site_data.json'];
        for (const sUrl of staticCandidates) {
          try {
            const sRes = await fetch(sUrl);
            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData && Array.isArray(sData.products) && sData.products.length > 0) {
                await this.saveLocalProducts(sData.products);
                return sData.products;
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    if (this._cachedProducts && Array.isArray(this._cachedProducts) && this._cachedProducts.length > 0) {
      return this._cachedProducts;
    }

    // Try IndexedDB first
    try {
      const idbData = await IdbStorage.get(this.storageKey);
      if (Array.isArray(idbData) && idbData.length > 0) {
        this._cachedProducts = idbData;
        return idbData;
      }
    } catch (e) {
      console.warn("Could not read from IndexedDB:", e);
    }

    return this.getLocalProducts();
  }

  async getById(id) {
    const numId = parseInt(id, 10);
    try {
      const res = await apiFetch(`products/${numId}`, {}, 3000);
      if (res && res.ok) {
        return await res.json();
      }
    } catch (err) {}

    const all = await this.getAll();
    return all.find(p => p.id === numId || parseInt(p.id, 10) === numId) || null;
  }

  async create(productData, token = null) {
    const isLive = typeof window !== 'undefined' && window.location.protocol !== 'file:';
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await apiFetch('products', {
        method: 'POST',
        headers,
        body: JSON.stringify(productData)
      }, 25000);
      if (res && res.ok) {
        const created = await res.json();
        const local = await this.getAll();
        local.push(created);
        await this.saveLocalProducts(local);
        return created;
      }
      if (res && !res.ok) {
        let errDetail = 'Sunucu ürün ekleme hatası (' + res.status + ')';
        try {
          const errData = await res.json();
          if (errData && errData.detail) errDetail = errData.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }
      if (isLive && !res) {
        throw new Error("Sunucuya bağlanılamadı. API yanıt vermedi. Lütfen backend_php klasörünü ve dosya izinlerini kontrol edin.");
      }
    } catch (err) {
      if (isLive) {
        console.error("Product create failed on live server:", err);
        throw err;
      }
      console.info("Creating product in local storage mode.");
    }

    // Offline / Fallback creation for file://
    const local = await this.getAll();
    const newId = local.length > 0 ? Math.max(...local.map(p => p.id || 0)) + 1 : 1;
    const newProduct = {
      id: newId,
      name: productData.name,
      description: productData.description || '',
      image_url: productData.image_url || 'images/placeholder.svg',
      images: Array.isArray(productData.images) ? productData.images : [],
      manual_url: productData.manual_url || null,
      parent_id: productData.parent_id ? parseInt(productData.parent_id, 10) : null
    };
    local.push(newProduct);
    await this.saveLocalProducts(local);
    return newProduct;
  }

  async delete(id, token = null) {
    const numId = parseInt(id, 10);
    const isLive = typeof window !== 'undefined' && window.location.protocol !== 'file:';
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await apiFetch(`products/${numId}/delete`, {
        method: 'DELETE',
        headers
      }, 15000);
      if (res && !res.ok) {
        let errDetail = 'Sunucu ürün silme hatası (' + res.status + ')';
        try {
          const errData = await res.json();
          if (errData && errData.detail) errDetail = errData.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }
      if (isLive && !res) {
        throw new Error("Sunucuya bağlanılamadı. Ürün silinemedi.");
      }
    } catch (err) {
      if (isLive) {
        console.error("Product delete failed on live server:", err);
        throw err;
      }
      console.info("Deleting product in local storage mode.");
    }

    let local = await this.getAll();
    local = local.filter(p => p.id !== numId && parseInt(p.id, 10) !== numId);
    // Unparent any children
    local.forEach(p => {
      if (p.parent_id === numId || parseInt(p.parent_id, 10) === numId) p.parent_id = null;
    });
    await this.saveLocalProducts(local);
    return true;
  }

  async update(id, productData, token = null) {
    const numId = parseInt(id, 10);
    const isLive = typeof window !== 'undefined' && window.location.protocol !== 'file:';
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await apiFetch(`products/${numId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(productData)
      }, 20000);
      if (res && res.ok) {
        const updated = await res.json();
        let local = await this.getAll();
        const idx = local.findIndex(p => p.id === numId || parseInt(p.id, 10) === numId);
        if (idx !== -1) local[idx] = updated;
        else local.push(updated);
        await this.saveLocalProducts(local);
        return updated;
      }
      if (res && !res.ok) {
        let errDetail = 'Sunucu ürün güncelleme hatası (' + res.status + ')';
        try {
          const errData = await res.json();
          if (errData && errData.detail) errDetail = errData.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }
      if (isLive && !res) {
        throw new Error("Sunucuya bağlanılamadı. Ürün güncellenemedi.");
      }
    } catch (err) {
      if (isLive) {
        console.error("Product update failed on live server:", err);
        throw err;
      }
      console.info("Updating product in local storage mode.");
    }

    // Offline fallback for file://
    let local = await this.getAll();
    const idx = local.findIndex(p => p.id === numId || parseInt(p.id, 10) === numId);
    if (idx !== -1) {
      const existingImages = local[idx].images || [];
      local[idx] = { 
        ...local[idx], 
        ...productData, 
        id: numId,
        images: productData.images !== undefined ? productData.images : existingImages
      };
      await this.saveLocalProducts(local);
      return local[idx];
    }
    return null;
  }

  async addImages(productId, imageUrls, token = null) {
    const numId = parseInt(productId, 10);
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) return [];
    const t = token || localStorage.getItem('admin_token') || localStorage.getItem('token');

    // 1. Try backend batch endpoint if available
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (t) headers['Authorization'] = `Bearer ${t}`;
      const res = await apiFetch(`products/${numId}/images/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image_urls: imageUrls })
      }, 20000);
      if (res && res.ok) {
        const added = await res.json();
        const all = await this.getAll();
        const p = all.find(item => item.id === numId || parseInt(item.id, 10) === numId);
        if (p) {
          if (!Array.isArray(p.images)) p.images = [];
          p.images.push(...added);
          await this.saveLocalProducts(all);
        }
        return added;
      }
    } catch (err) {
      console.warn("Batch addImages failed, attempting sequential:", err);
    }

    // 2. Try sequential API add if single endpoint exists
    let apiSuccess = false;
    const addedImages = [];
    try {
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        const headers = { 'Content-Type': 'application/json' };
        if (t) headers['Authorization'] = `Bearer ${t}`;
        const res = await apiFetch(`products/${numId}/images`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ image_url: url, sort_order: i })
        }, 15000);
        if (res && res.ok) {
          const imgObj = await res.json();
          addedImages.push(imgObj);
          apiSuccess = true;
        } else {
          break;
        }
      }
    } catch (err) {
      apiSuccess = false;
    }

    if (apiSuccess && addedImages.length > 0) {
      const all = await this.getAll();
      const p = all.find(item => item.id === numId || parseInt(item.id, 10) === numId);
      if (p) {
        if (!Array.isArray(p.images)) p.images = [];
        p.images.push(...addedImages);
        await this.saveLocalProducts(all);
      }
      return addedImages;
    }

    // 3. Local / IndexedDB mode
    const all = await this.getAll();
    const p = all.find(item => item.id === numId || parseInt(item.id, 10) === numId);
    if (!p) return [];
    if (!Array.isArray(p.images)) p.images = [];

    // Max 20 photos total per product
    const hasPrimary = p.image_url && p.image_url !== 'images/placeholder.svg';
    const currentCount = p.images.length + (hasPrimary ? 1 : 0);
    const availableSlots = Math.max(0, 20 - currentCount);
    const urlsToAdd = imageUrls.slice(0, availableSlots);

    const now = Date.now();
    const newItems = urlsToAdd.map((url, idx) => ({
      id: now + idx + Math.floor(Math.random() * 1000),
      product_id: numId,
      image_url: url,
      sort_order: p.images.length + idx
    }));

    p.images.push(...newItems);
    await this.saveLocalProducts(all);
    return newItems;
  }

  async addImage(productId, imageUrl, sortOrder = 0, token = null) {
    const results = await this.addImages(productId, [imageUrl], token);
    return results && results.length > 0 ? results[0] : null;
  }

  async deleteImage(productId, imageId, token = null) {
    const numId = parseInt(productId, 10);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await apiFetch(`products/${numId}/images/${imageId}/delete`, {
        method: 'DELETE',
        headers
      }, 15000);
    } catch (err) {
      console.info("Deleting image in local storage mode.");
    }

    let local = await this.getAll();
    const p = local.find(item => item.id === numId || parseInt(item.id, 10) === numId);
    if (p && Array.isArray(p.images)) {
      p.images = p.images.filter(img => {
        if (!img) return false;
        if (typeof img === 'string') {
          return img !== imageId;
        }
        if (typeof img === 'object') {
          if (img.id && (img.id == imageId || String(img.id) === String(imageId))) {
            return false;
          }
          if (img.image_url && img.image_url === imageId) {
            return false;
          }
        }
        return true;
      });
      await this.saveLocalProducts(local);
    }
    return true;
  }

  async uploadFile(file) {
    if (!file) return null;

    // 1. Client-side pre-compression: resize large camera/phone photos before uploading
    let fileToUpload = file;
    if (file.type && file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      try {
        fileToUpload = await compressImageFile(file, 1400, 0.82);
      } catch (cErr) {
        console.warn("Client pre-compression skipped:", cErr);
      }
    }

    // 2. Upload lightweight compressed file to backend
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const res = await apiFetch('upload', {
        method: 'POST',
        body: formData
      }, 25000);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.url) return data.url;
      }
    } catch (err) {
      console.warn("Backend upload failed, converting to compressed data URL:", err);
    }

    // Client-side compressed Data URL fallback
    return await imageToDataUrl(file, 1200, 0.78);
  }
}

// Global ProductService instance
window.ProductService = new ProductService();

/**
 * Default references catalog
 */
const DEFAULT_REFERENCES = [
  { id: 1, company_name: "Aselsan", logo_url: "", description: "Savunma ve radar sistemleri için termoplastik ve ped de-icing çözümleri.", product_ids: "[8, 9, 10]", images: [] },
  { id: 2, company_name: "Jandarma Genel Komutanlığı", logo_url: "", description: "Haberleşme istasyonları ve anten kuleleri için zorlu hava şartları buz çözme sistemleri.", product_ids: "[8, 11]", images: [] },
  { id: 3, company_name: "Kara Kuvvetleri Komutanlığı", logo_url: "", description: "Saha uydu terminalleri ve radar de-icing montajları.", product_ids: "[8, 12]", images: [] },
  { id: 4, company_name: "TRT", logo_url: "", description: "Verici kuleleri ve yayın antenleri için blower ve ped de-icing entegrasyonu.", product_ids: "[9, 15]", images: [] },
  { id: 5, company_name: "Türksat", logo_url: "", description: "Yer istasyonu RX/TX çanak antenleri için termoplastik ve branda de-icing sistemleri.", product_ids: "[8, 13]", images: [] },
  { id: 6, company_name: "Anadolu Ajansı", logo_url: "", description: "Yayın ve canlı yayın araçları uydu anteni koruma sistemleri.", product_ids: "[8, 9]", images: [] },
  { id: 7, company_name: "NTV", logo_url: "", description: "Yayın kuleleri ve uydu antenleri buz koruma donanımları.", product_ids: "[9, 15]", images: [] },
  { id: 8, company_name: "ATV", logo_url: "", description: "Yayın aktarma merkezleri de-icing ve pano kontrol üniteleri.", product_ids: "[9, 10]", images: [] },
  { id: 9, company_name: "Kanal D", logo_url: "", description: "Yayın merkezleri çanak anten de-icing sistemleri.", product_ids: "[8, 9]", images: [] },
  { id: 10, company_name: "Show TV", logo_url: "", description: "Uydu uplink antenleri için güvenilir de-icing ve ısıtma pedleri.", product_ids: "[9, 14]", images: [] },
  { id: 11, company_name: "Kanal 24", logo_url: "", description: "Merkez antenleri kar ve buzlanma önleme projeleri.", product_ids: "[8, 15]", images: [] },
  { id: 12, company_name: "Digiturk", logo_url: "", description: "Uplink merkezi büyük ölçekli çanak anten blower de-icing sistemleri.", product_ids: "[15, 10]", images: [] },
  { id: 13, company_name: "beIN Sports", logo_url: "", description: "Canlı spor yayın istasyonları ve yer istasyonları için kesintisiz anten ısıtma sistemleri.", product_ids: "[8, 15]", images: [] },
  { id: 14, company_name: "Türk Telekom", logo_url: "", description: "Telekomünikasyon kuleleri ve baz istasyonu anten ısıtıcıları ve RS485 sensörleri.", product_ids: "[10, 11, 14]", images: [] },
  { id: 15, company_name: "Türksat Kablo", logo_url: "", description: "Kablo TV ana merkez istasyonları için de-icing modülleri.", product_ids: "[9, 11]", images: [] },
  { id: 16, company_name: "İşNet", logo_url: "", description: "Veri merkezleri ve uydu haberleşme antenleri için buz önleme çözümleri.", product_ids: "[8, 10]", images: [] },
  { id: 17, company_name: "Milli Eğitim Bakanlığı", logo_url: "", description: "EBA ve eğitim yayın uydu alıcı antenleri koruma projesi.", product_ids: "[8, 9]", images: [] }
];

/**
 * ReferenceService manages references across API, IndexedDB, and LocalStorage fallback
 */
class ReferenceService {
  constructor() {
    this.storageKey = 'ikies_references';
    this._cachedReferences = null;
  }

  normalizeReference(r) {
    if (!r) return r;
    if (typeof r.images === 'string') {
      try {
        r.images = JSON.parse(r.images);
      } catch (_) {
        r.images = [];
      }
    }
    if (!Array.isArray(r.images)) {
      r.images = [];
    }
    return r;
  }

  getLocalReferences() {
    if (this._cachedReferences && Array.isArray(this._cachedReferences) && this._cachedReferences.length > 0) {
      return this._cachedReferences.map(r => this.normalizeReference(r));
    }
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this._cachedReferences = parsed.map(r => this.normalizeReference(r));
          return this._cachedReferences;
        }
      }
    } catch (e) {
      console.warn("Could not read references from localStorage:", e);
    }
    this.saveLocalReferences(DEFAULT_REFERENCES);
    return DEFAULT_REFERENCES.map(r => this.normalizeReference(r));
  }

  saveLocalReferences(refs) {
    const normalized = (refs || []).map(r => this.normalizeReference(r));
    this._cachedReferences = normalized;
    IdbStorage.set(this.storageKey, normalized).catch(err => {
      console.warn("Could not save references to IndexedDB:", err);
    });
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(normalized));
    } catch (e) {
      console.info("LocalStorage quota exceeded for references; preserved in IndexedDB.");
    }
  }

  async getAll() {
    // Only attempt network API / static fetch if not on file:// protocol
    if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
      try {
        const res = await apiFetch('references', {}, 8000);
        if (res && res.ok) {
          const refs = await res.json();
          if (Array.isArray(refs) && refs.length > 0) {
            const normalized = refs.map(r => this.normalizeReference(r));
            this.saveLocalReferences(normalized);
            return normalized;
          }
        }
      } catch (err) {
        console.info("Using local references catalog (Backend offline or static mode).");
      }

      // Static fallback to site_data.json
      try {
        const staticCandidates = ['data/site_data.json', '/data/site_data.json', '../data/site_data.json'];
        for (const sUrl of staticCandidates) {
          try {
            const sRes = await fetch(sUrl);
            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData && Array.isArray(sData.references) && sData.references.length > 0) {
                const normalized = sData.references.map(r => this.normalizeReference(r));
                this.saveLocalReferences(normalized);
                return normalized;
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    if (this._cachedReferences && Array.isArray(this._cachedReferences) && this._cachedReferences.length > 0) {
      return this._cachedReferences.map(r => this.normalizeReference(r));
    }

    try {
      const idbData = await IdbStorage.get(this.storageKey);
      if (Array.isArray(idbData) && idbData.length > 0) {
        const normalized = idbData.map(r => this.normalizeReference(r));
        this._cachedReferences = normalized;
        return normalized;
      }
    } catch (e) {}

    return this.getLocalReferences();
  }

  async getById(id) {
    const numId = parseInt(id, 10);
    try {
      const res = await apiFetch(`references/${numId}`, {}, 8000);
      if (res && res.ok) {
        const item = await res.json();
        return this.normalizeReference(item);
      }
    } catch (err) {}
    const all = await this.getAll();
    return all.find(r => r.id === numId) || null;
  }

  async create(refData, token = null) {
    const isLive = typeof window !== 'undefined' && window.location.protocol !== 'file:';
    const payload = { ...refData };
    if (payload.images && Array.isArray(payload.images)) {
      payload.images = payload.images.slice(0, 20);
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await apiFetch('references', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }, 25000);
      if (res && res.ok) {
        const created = await res.json();
        this.normalizeReference(created);
        const local = this.getLocalReferences();
        local.push(created);
        this.saveLocalReferences(local);
        return created;
      }
      if (res && !res.ok) {
        let errDetail = 'Sunucu referans ekleme hatası (' + res.status + ')';
        try {
          const errData = await res.json();
          if (errData && errData.detail) errDetail = errData.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }
      if (isLive && !res) {
        throw new Error("Sunucuya bağlanılamadı. API yanıt vermedi. Lütfen backend_php klasörünü ve dosya izinlerini kontrol edin.");
      }
    } catch (err) {
      if (isLive) {
        console.error("Reference create failed on live server:", err);
        throw err;
      }
      console.info("Creating reference in local storage mode.");
    }

    const local = this.getLocalReferences();
    const newId = local.length > 0 ? Math.max(...local.map(r => r.id || 0)) + 1 : 1;
    let initialImages = [];
    if (Array.isArray(refData.images)) {
      initialImages = refData.images.slice(0, 20);
    } else if (typeof refData.images === 'string') {
      try { initialImages = JSON.parse(refData.images).slice(0, 20); } catch (_) { initialImages = []; }
    }

    const newRef = {
      id: newId,
      company_name: refData.company_name,
      logo_url: refData.logo_url || null,
      description: refData.description || '',
      product_ids: typeof refData.product_ids === 'string' ? refData.product_ids : JSON.stringify(refData.product_ids || []),
      images: initialImages
    };
    local.push(newRef);
    this.saveLocalReferences(local);
    return newRef;
  }

  async update(id, refData, token = null) {
    const numId = parseInt(id, 10);
    const isLive = typeof window !== 'undefined' && window.location.protocol !== 'file:';
    const local = this.getLocalReferences();
    const existing = local.find(r => r.id === numId);
    const existingImages = existing && Array.isArray(existing.images) ? existing.images : [];

    const payload = { ...refData };
    if (payload.images === undefined && existingImages) {
      payload.images = existingImages;
    } else if (Array.isArray(payload.images)) {
      payload.images = payload.images.slice(0, 20);
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await apiFetch(`references/${numId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      }, 20000);
      if (res && res.ok) {
        const updated = await res.json();
        this.normalizeReference(updated);
        const idx = local.findIndex(r => r.id === numId);
        if (idx !== -1) local[idx] = updated;
        else local.push(updated);
        this.saveLocalReferences(local);
        return updated;
      }
      if (res && !res.ok) {
        let errDetail = 'Sunucu referans güncelleme hatası (' + res.status + ')';
        try {
          const errData = await res.json();
          if (errData && errData.detail) errDetail = errData.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }
      if (isLive && !res) {
        throw new Error("Sunucuya bağlanılamadı. Referans güncellenemedi.");
      }
    } catch (err) {
      if (isLive) {
        console.error("Reference update failed on live server:", err);
        throw err;
      }
      console.info("Updating reference in local storage mode.");
    }

    const idx = local.findIndex(r => r.id === numId);
    if (idx !== -1) {
      local[idx] = { 
        ...local[idx], 
        ...refData, 
        id: numId,
        images: refData.images !== undefined ? (Array.isArray(refData.images) ? refData.images.slice(0, 20) : refData.images) : existingImages
      };
      this.normalizeReference(local[idx]);
      this.saveLocalReferences(local);
      return local[idx];
    }
    return null;
  }

  async addImages(refId, imageUrls, token = null) {
    const numId = parseInt(refId, 10);
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) return [];

    const all = await this.getAll();
    const ref = all.find(item => item.id === numId || parseInt(item.id, 10) === numId);
    if (!ref) return [];
    if (!Array.isArray(ref.images)) ref.images = [];

    // Max 20 photos total per reference
    const currentCount = ref.images.length;
    const availableSlots = Math.max(0, 20 - currentCount);
    const urlsToAdd = imageUrls.slice(0, availableSlots);
    if (urlsToAdd.length === 0) return [];

    const now = Date.now();
    const newItems = urlsToAdd.map((url, idx) => ({
      id: now + idx + Math.floor(Math.random() * 1000),
      reference_id: numId,
      image_url: url,
      sort_order: ref.images.length + idx
    }));

    ref.images.push(...newItems);

    // Save update via API or local
    await this.update(numId, { images: ref.images }, token);
    return newItems;
  }

  async deleteImage(refId, imageId, token = null) {
    const numId = parseInt(refId, 10);
    let local = await this.getAll();
    const ref = local.find(item => item.id === numId || parseInt(item.id, 10) === numId);
    if (ref && Array.isArray(ref.images)) {
      ref.images = ref.images.filter(img => {
        if (!img) return false;
        if (typeof img === 'string') {
          return img !== imageId;
        }
        if (typeof img === 'object') {
          if (img.id && (img.id == imageId || String(img.id) === String(imageId))) {
            return false;
          }
          if (img.image_url && img.image_url === imageId) {
            return false;
          }
        }
        return true;
      });
      await this.update(numId, { images: ref.images }, token);
    }
    return true;
  }

  async delete(id, token = null) {
    const numId = parseInt(id, 10);
    const isLive = typeof window !== 'undefined' && window.location.protocol !== 'file:';
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await apiFetch(`references/${numId}/delete`, {
        method: 'DELETE',
        headers
      }, 15000);
      if (res && !res.ok) {
        let errDetail = 'Sunucu referans silme hatası (' + res.status + ')';
        try {
          const errData = await res.json();
          if (errData && errData.detail) errDetail = errData.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }
      if (isLive && !res) {
        throw new Error("Sunucuya bağlanılamadı. Referans silinemedi.");
      }
    } catch (err) {
      if (isLive) {
        console.error("Reference delete failed on live server:", err);
        throw err;
      }
      console.info("Deleting reference in local storage mode.");
    }

    let local = this.getLocalReferences();
    local = local.filter(r => r.id !== numId);
    this.saveLocalReferences(local);
    return true;
  }
}

// Global ReferenceService instance
window.ReferenceService = new ReferenceService();

/**
 * SettingsService manages hero backgrounds, about us text, and contact/maps settings
 */
class SettingsService {
  constructor() {
    this.storageKey = 'ikies_site_settings';
    this._cachedSettings = null;
  }

  getDefaults() {
    return {
      hero_backgrounds: [
        'images/IMG_3723.JPG',
        'images/IMG_3694.JPG',
        'images/IMG_2004.JPG'
      ],
      hero_title: 'Zorlu Koşullara Meydan Okuyoruz',
      hero_subtitle: 'TV, Uydu, RX, TX Antenleri ve Özel Sensör Modülleri için Profesyonel De-icing ve Kontrol Sistemleri.',
      hero_badge: 'Profesyonel De-icing & Sensör Modülleri',
      about_title: 'Hakkımızda',
      about_badge: '1994\'ten Günümüze',
      about_content: '1994 yılından beri elektronik ve otomasyon sektöründe öncü çözümler üreten İkies Elektronik, özellikle zorlu kış şartlarında haberleşmenin kesintisiz devam etmesini sağlayan De-icing (Buz çözme) sistemleri alanında uzmanlaşmıştır.\n\nKendi bünyemizde geliştirdiğimiz akıllı sensör modülleri ve farklı anten tiplerine özel olarak tasarlanan (Termoplastik, Branda, Radom, Ped, Blower) de-icing sistemlerimiz ile müşterilerimize uzun yıllar bakım gerektirmeyen, yüksek verimli ve enerji tasarruflu çözümler sunuyoruz.',
      contact_title: 'İletişim',
      contact_badge: 'Bize Ulaşın',
      contact_description: 'Projeleriniz ve özel teknik talepleriniz için ekibimizle iletişime geçin',
      contact_address: 'İçerenköy Mh. Necmettin Erbakan Cad, İçerenköy, Ahmet Tarık Sok. No: 35B, 34752 Ataşehir/İstanbul',
      contact_email: 'info@ikies.net',
      contact_phone: '+90 216 574 08 26',
      contact_instagram: 'https://www.instagram.com/ikieselektroniksan?vrfl=aGk4dTF3dnAzaTh1',
      contact_map_query: 'İçerenköy Mh. Necmettin Erbakan Cad, İçerenköy, Ahmet Tarık Sok. No: 35B, 34752 Ataşehir/İstanbul'
    };
  }

  getLocalSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.getDefaults(), ...parsed };
      }
    } catch (_) {}
    return this.getDefaults();
  }

  saveLocalSettings(settings) {
    const merged = { ...this.getDefaults(), ...settings };
    this._cachedSettings = merged;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(merged));
    } catch (_) {}
    try {
      IdbStorage.set(this.storageKey, merged);
    } catch (_) {}
    return merged;
  }

  async getSettings() {
    if (this._cachedSettings) return this._cachedSettings;

    // Check IndexedDB
    try {
      const idbData = await IdbStorage.get(this.storageKey);
      if (idbData && typeof idbData === 'object' && Object.keys(idbData).length > 0) {
        const merged = { ...this.getDefaults(), ...idbData };
        this._cachedSettings = merged;
        return merged;
      }
    } catch (_) {}

    // Check Backend API if live
    const isLive = typeof window !== 'undefined' && window.location.protocol !== 'file:';
    if (isLive) {
      try {
        const res = await apiFetch('settings', {}, 6000);
        if (res && res.ok) {
          const apiData = await res.json();
          if (apiData && typeof apiData === 'object' && Object.keys(apiData).length > 0) {
            const merged = { ...this.getDefaults(), ...apiData };
            this.saveLocalSettings(merged);
            return merged;
          }
        }
      } catch (err) {
        console.warn("Could not fetch settings from API, using local fallback:", err);
      }
    }

    const local = this.getLocalSettings();
    this._cachedSettings = local;
    return local;
  }

  async saveSettings(newSettings, token = null) {
    const merged = { ...this.getLocalSettings(), ...newSettings };
    this.saveLocalSettings(merged);

    const isLive = typeof window !== 'undefined' && window.location.protocol !== 'file:';
    if (isLive) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await apiFetch('settings', {
          method: 'POST',
          headers,
          body: JSON.stringify(merged)
        }, 15000);
        if (res && res.ok) {
          const updated = await res.json();
          if (updated && typeof updated === 'object') {
            return this.saveLocalSettings(updated);
          }
        }
      } catch (err) {
        console.warn("Failed to persist settings to API, saved locally:", err);
      }
    }
    return merged;
  }

  applyToDOM(settings = null) {
    const s = settings || this._cachedSettings || this.getLocalSettings();

    // 1. Hero background images & slider
    const slidesContainer = document.getElementById('hero-slides-container') || document.querySelector('.hero');
    if (slidesContainer && Array.isArray(s.hero_backgrounds) && s.hero_backgrounds.length > 0) {
      const existingSlides = slidesContainer.querySelectorAll('.slide.hero-bg');
      existingSlides.forEach(el => el.remove());

      const fragment = document.createDocumentFragment();
      s.hero_backgrounds.forEach((bg, idx) => {
        const img = document.createElement('img');
        img.src = bg;
        img.className = `slide hero-bg ${idx === 0 ? 'active' : ''}`;
        img.alt = `Hero Background ${idx + 1}`;
        fragment.appendChild(img);
      });
      slidesContainer.insertBefore(fragment, slidesContainer.firstChild);

      if (window.__heroImageSlider) {
        window.__heroImageSlider.updateSlides();
      }
    }

    // Hero Texts
    const heroTitle = document.getElementById('hero-title-text');
    if (heroTitle && s.hero_title) heroTitle.textContent = s.hero_title;

    const heroSubtitle = document.getElementById('hero-subtitle-text');
    if (heroSubtitle && s.hero_subtitle) heroSubtitle.textContent = s.hero_subtitle;

    const heroBadge = document.getElementById('hero-badge-text');
    if (heroBadge && s.hero_badge) heroBadge.textContent = s.hero_badge;

    // 2. About us (Hakkımızda)
    const aboutTitle = document.getElementById('site-about-title');
    if (aboutTitle && s.about_title) aboutTitle.textContent = s.about_title;

    const aboutBadge = document.getElementById('site-about-badge');
    if (aboutBadge && s.about_badge) aboutBadge.textContent = s.about_badge;

    const aboutContent = document.getElementById('site-about-content');
    if (aboutContent && s.about_content) {
      const paragraphs = s.about_content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      if (paragraphs.length > 0) {
        aboutContent.innerHTML = paragraphs.map((p, idx) => `
          <p style="font-size: 1rem; color: hsl(var(--muted-foreground)); line-height: 1.75; ${idx === paragraphs.length - 1 ? 'margin: 0;' : 'margin-bottom: 1rem;'}">
            ${p.replace(/\n/g, '<br>')}
          </p>
        `).join('');
      } else {
        aboutContent.innerHTML = `<p style="font-size: 1rem; color: hsl(var(--muted-foreground)); line-height: 1.75; margin: 0;">${s.about_content.replace(/\n/g, '<br>')}</p>`;
      }
    }

    // 3. Contact (İletişim)
    const contactBadge = document.getElementById('contact-badge');
    if (contactBadge && s.contact_badge) contactBadge.textContent = s.contact_badge;

    const contactTitle = document.getElementById('contact-title');
    if (contactTitle && s.contact_title) contactTitle.textContent = s.contact_title;

    const contactDesc = document.getElementById('contact-desc');
    if (contactDesc && s.contact_description) contactDesc.textContent = s.contact_description;

    const contactAddress = document.getElementById('contact-address-text');
    if (contactAddress && s.contact_address) contactAddress.textContent = s.contact_address;

    const contactEmail = document.getElementById('contact-email-link');
    if (contactEmail && s.contact_email) {
      contactEmail.textContent = s.contact_email;
      contactEmail.href = `mailto:${s.contact_email}`;
    }

    const contactMailBtn = document.getElementById('contact-mailto-btn');
    if (contactMailBtn && s.contact_email) {
      contactMailBtn.href = `mailto:${s.contact_email}`;
    }

    const contactPhone = document.getElementById('contact-phone-link');
    const contactPhoneCard = document.getElementById('contact-phone-card');
    if (s.contact_phone && s.contact_phone.trim()) {
      if (contactPhone) {
        contactPhone.textContent = s.contact_phone;
        contactPhone.href = `tel:${s.contact_phone.replace(/\s+/g, '')}`;
      }
      if (contactPhoneCard) contactPhoneCard.style.display = 'block';
    } else if (contactPhoneCard) {
      contactPhoneCard.style.display = 'none';
    }

    const contactInstaLink = document.getElementById('contact-insta-link');
    if (contactInstaLink) {
      contactInstaLink.href = s.contact_instagram || 'https://www.instagram.com/ikieselektroniksan?vrfl=aGk4dTF3dnAzaTh1';
    }

    // Google Maps Iframe & Link
    const mapIframe = document.getElementById('contact-map-iframe');
    const mapExtLink = document.getElementById('contact-map-external-link');
    const mapQuery = (s.contact_map_query || s.contact_address || '').trim();
    if (mapQuery) {
      const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      const viewUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}`;
      if (mapIframe && !mapIframe.src.includes(encodeURIComponent(mapQuery))) {
        mapIframe.src = embedUrl;
      }
      if (mapExtLink) {
        mapExtLink.href = viewUrl;
      }
    }
  }
}

// Global SettingsService instance
window.SettingsService = new SettingsService();

/**
 * Robust manual file helper utilities
 */
function getManualFileInfo(url, productName) {
  let ext = 'pdf';
  let label = 'PDF';

  if (!url) {
    const safeName = (productName || 'Kilavuz').replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ _-]/g, '').trim();
    return { ext: 'pdf', label: 'PDF', fileName: `${safeName || 'Kilavuz'}.pdf` };
  }

  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;,]+)/);
    if (match) {
      const mime = match[1].toLowerCase();
      if (mime.includes('pdf')) {
        ext = 'pdf';
        label = 'PDF';
      } else if (mime.includes('word') || mime.includes('document')) {
        ext = 'docx';
        label = 'DOCX';
      } else if (mime.includes('msword')) {
        ext = 'doc';
        label = 'DOC';
      }
    }
  } else {
    const cleanPath = url.split('?')[0].split('#')[0];
    const extracted = cleanPath.split('.').pop().toLowerCase();
    if (/^[a-z0-9]{2,5}$/.test(extracted)) {
      ext = extracted;
      label = extracted.toUpperCase();
    }
  }

  const safeName = (productName || 'Kilavuz').replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ _-]/g, '').trim();
  const fileName = `${safeName || 'Kilavuz'}.${ext}`;

  return { ext, label, fileName };
}

function triggerBlobDownload(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}

function downloadManualFile(url, productName) {
  if (!url) {
    alert('Teknik kılavuz dosyası bulunamadı.');
    return;
  }

  const fileInfo = getManualFileInfo(url, productName);
  const filename = fileInfo.fileName;

  // 1. Data URL (Base64) - offline, localStorage fallback, or file://
  if (url.startsWith('data:')) {
    try {
      const arr = url.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      triggerBlobDownload(blob, filename);
      return;
    } catch (e) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
  }

  // 2. Regular URL: Direct fetch with HTML detection
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('Direct fetch status ' + res.status);
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html') && !filename.toLowerCase().endsWith('.html')) {
        throw new Error('Server returned HTML instead of manual document');
      }
      return res.blob();
    })
    .then(blob => {
      triggerBlobDownload(blob, filename);
    })
    .catch(err => {
      console.warn('Direct fetch failed, trying /api/download endpoint:', err);
      // Try backend download endpoint
      const urlFilename = url.split('/').pop().split('?')[0];
      const apiUrl = '/api/download?file=' + encodeURIComponent(urlFilename);

      fetch(apiUrl)
        .then(res => {
          if (!res.ok) throw new Error('API download status ' + res.status);
          const contentType = (res.headers.get('content-type') || '').toLowerCase();
          if (contentType.includes('text/html') && !filename.toLowerCase().endsWith('.html')) {
            throw new Error('API returned HTML');
          }
          return res.blob();
        })
        .then(blob => {
          triggerBlobDownload(blob, filename);
        })
        .catch(finalErr => {
          console.warn('All blob downloads failed, opening URL in new tab:', finalErr);
          window.open(url, '_blank');
        });
    });
}

window.getManualFileInfo = getManualFileInfo;
window.downloadManualFile = downloadManualFile;

/**
 * PageController orchestrates the components
 */
class PageController {
  constructor() {
    this.components = [];
  }

  registerComponent(component) {
    this.components.push(component);
  }

  initAll() {
    // Polymorphism in action: each component calls its own init()
    this.components.forEach(comp => {
      try {
        if (comp.element) comp.init();
      } catch (e) {
        console.error(e);
      }
    });
  }
}

/**
 * Theme Manager for Light / Dark Mode switching
 */
function initThemeManager() {
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('ikies_theme', theme);
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  };

  const currentTheme = localStorage.getItem('ikies_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    if (btn.dataset.themeBound === 'true') return;
    btn.dataset.themeBound = 'true';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(current);
    });
  });
}

// Embedded logo data URI for foolproof rendering across all environments
const EMBEDDED_SITE_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAzCAYAAADVY1sUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxIAAAsSAdLdfvwAAAWRSURBVGhD1ZltaFtVGMfPOTdp6+pe2rBWmya1WBq1A8Eqc5OJcyo6HAPnyxcRPzqVbaggrIKCVPzgnDrxBT/ot32xfpDhBuJ8AV86FDadbq3tXNN0WRMbsF1tkpt7j/9z8yyYNUvuSXPL8oP2nP+zJff+73NennPLJ/ytpzlnrWwpSDYnOTtiM/ZudzZ1iqJlCYfbu23b9yyu/SBkSz5aPTza0JpAs5b0kpCMWUzKt+bM1N51jGUpfClGZ2fHANoBznlDPrR0amrkIlLKr7i5YluYxRYo5NDfz/yJRMdBXG8HhWqGoLam4ElvYQ0LH5MskEgE93thQuGJEeKxWEPrI9RnwWBwM5pn8qr2eGmEWZK9innDVR+TetAJeoQnc+T/WJzdvWntVUnO5W8U8gRPM6IwbLYNJtQS6ymeG8HAul1KtoGUZ3hvhLFe+vGU5TASEExeS33PWA4jGF38aup6xrIYwV6PMsxbPDeCfUSioJwj6Rk86m89JDlfQ7os2NluQqNZqcrkxja1jzif1eECVrsT1K+Is+u64UzTmi6fLf7AR1ZQyBXIyI93tDUlYGQ7hdySQypvicVirjZS10PLZxlv6JpQ4Kkeg4ljJHXwcW6/g9bVw3Zl5GxjYAu+7mGSWghhH8YNHSGpCb8rFOp4lERZKrrF0PBH/YHjVYxxlY54yEyFcBG7szP4O77jRvoXHSZzOfuGeDz+L+mSVMwISvGnqzKh4Ow9mLDQw3rC3s4HtQkZBlcnyrKUzch4c1u737RG0F2dj7hHYrXKZFlPL0vNKt3T09OYTi+cgqFu5z9ogBNnmnNj3eTk5DiFFlE2Iz7Teg2NtgmFlGLgognF2NhYBiPsOZJa4MTZJKWN0+XluWxGor7AbbD5E7ramyay8W04m9qML8cUKwaTdwiXfYikFrbNtk5NTR0mWUTJm8TVhRTsALraJoBlSGNPKRMKzq0XMFSQHX2EYPv7+/v9JIsoeaPY7Z/AjawnqQXu/pNOM3mc5CKi0em/0JQdJmWITE/H91C/iEVDa5y1rPb7+Wk8umso5BqYmM35jd7r5xPTFCpJJBJYOT/fOIqxr38NyWYNwxeZmJg4TyGHRRnx+flL1ZhQwMhgJROKkZEZVUTuzSs9sOqtsqzc6yQLFGXkTEMg4mPsV3S13wBi3I/Nmam+Mm8YL0VgkxzGjd1KWgcbE38jJv4w6eKMGFK+iaa615icP69hQmELIXejLbkoVEDgs2qDLSSiYCTa2HI/xuxWklrYkn3ZlZ35nKRrotFzP8DHQZKa8PXhcPBxEnkjeCQGkwLVbVWYjMuSK4kbbJu/iGY+r/TAxB9UFYPqO0ZQT6mzQp/qayPZ+9dlUzinVAfGeQzza9HkdUkok1l4UnUcI5bkO1WrC3bwv1eauZdJLgGxD0/3LAldnlK/eLy5vS1r5s5h1hhOWANps51duZkPSC6JYDC4Azv3pyS1sCwZEWY2d09VJpg8Ec7NfERyyWCIfYZv/ZqkFijzHxCY6NqvM/EZyYXYjQegzhq1AlNFqOU4l5fuwbDcoP6GeBTLrvrbhQYyIxn/mURF7mxvRPa5q6xjg7wZjeYLPXlSGfkTRnoo4gmb2posm+sPX7cglf8IVbuQrluQiFVq+S2qt+oULqTkaRJ1izqoYWjJimX3lQ8/r5bfUVL1zKgyUqjp6xUsWMNCcOMLtcFRrC7BIeuQCGeSY/DxHcXqEHlSnRSd6tfm/BUnVofgPOPcu2OkOzPzjc3kh6pfX8ghZGNI9Rwjiq5saheKr5Jv8a5EcK/fp9Omc6hSFIxge88mzZnt2Fz2YebXsqqtNTbuEccHfm8ymbxAsdLlyYS/pQ/1yy4U6/fhPN5M4apB0YihzAsPrUrSyMJRIewD0Wj8F4oRjP0HDhzSJVP5xe0AAAAASUVORK5CYII=';

function ensureLogoFallback() {
  document.querySelectorAll('img.logo-img, img[src*="logo.png"]').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) {
      img.src = EMBEDDED_SITE_LOGO;
    }
    img.addEventListener('error', function() {
      this.onerror = null;
      this.src = EMBEDDED_SITE_LOGO;
    });
  });
}

// Run immediately for fast-loaded DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureLogoFallback);
} else {
  ensureLogoFallback();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new PageController();
  
  app.registerComponent(new Navbar('.navbar'));
  app.registerComponent(new ImageSlider('.hero-slider, .hero'));
  app.registerComponent(new BackdropAnimation()); // Register the geometric backdrop
  
  app.initAll();
  
  // Initialize theme toggle
  initThemeManager();

  // Initialize cart badge
  window.cart.updateCartBadge();

  // Apply site settings (hero backgrounds, about us, contact & google map)
  if (window.SettingsService) {
    window.SettingsService.applyToDOM();
    window.SettingsService.getSettings().then(s => {
      window.SettingsService.applyToDOM(s);
    });
  }

  // Run fallback check again after full initialization
  ensureLogoFallback();
});

