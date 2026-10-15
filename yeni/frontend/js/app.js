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
      this.toggleButton.addEventListener('click', () => {
        this.navLinks.classList.toggle('show');
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
  }

  init() {
    if (this.slides.length > 0) {
      this.startSlider();
    }
  }

  showNextSlide() {
    this.slides[this.current].classList.remove('active');
    this.current = (this.current + 1) % this.slides.length;
    this.slides[this.current].classList.add('active');
  }

  startSlider() {
    this.intervalId = setInterval(() => this.showNextSlide(), 5000);
  }

  stopSlider() {
    if (this.intervalId) clearInterval(this.intervalId);
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
        try {
          const req = window.indexedDB.open('ikies_db', 1);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('keyval')) {
              db.createObjectStore('keyval');
            }
          };
          req.onsuccess = (e) => resolve(e.target.result);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  },
  async get(key) {
    try {
      const db = await this.getDb();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction('keyval', 'readonly');
        const store = tx.objectStore('keyval');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  },
  async set(key, val) {
    try {
      const db = await this.getDb();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        const req = store.put(val, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  },
  async delete(key) {
    try {
      const db = await this.getDb();
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
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/products', { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const products = await res.json();
        if (Array.isArray(products) && products.length > 0) {
          await this.saveLocalProducts(products);
          return products;
        }
      }
    } catch (err) {
      console.info("Using local product catalog (Backend offline or static mode).");
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`/api/products/${numId}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    const all = await this.getAll();
    return all.find(p => p.id === numId || parseInt(p.id, 10) === numId) || null;
  }

  async create(productData, token = null) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(productData)
      });
      if (res.ok) {
        const created = await res.json();
        const local = await this.getAll();
        local.push(created);
        await this.saveLocalProducts(local);
        return created;
      }
    } catch (err) {
      console.info("Creating product in local storage mode.");
    }

    // Offline / Fallback creation
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
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/products/${numId}`, {
        method: 'DELETE',
        headers
      });
    } catch (err) {
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
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/products/${numId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(productData)
      });
      if (res.ok) {
        const updated = await res.json();
        let local = await this.getAll();
        const idx = local.findIndex(p => p.id === numId || parseInt(p.id, 10) === numId);
        if (idx !== -1) local[idx] = updated;
        await this.saveLocalProducts(local);
        return updated;
      }
    } catch (err) {
      console.info("Updating product in local storage mode.");
    }

    // Offline fallback
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

    // 1. Try backend batch endpoint if available
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/products/${numId}/images/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image_urls: imageUrls })
      });
      if (res.ok) {
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
      // Backend batch not available
    }

    // 2. Try sequential API add if single endpoint exists
    let apiSuccess = false;
    const addedImages = [];
    try {
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/products/${numId}/images`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ image_url: url, sort_order: i })
        });
        if (res.ok) {
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
      await fetch(`/api/products/${numId}/images/${imageId}`, {
        method: 'DELETE',
        headers
      });
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

    // First try backend upload endpoint if reachable
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.url) return data.url;
      }
    } catch (err) {
      // Backend not running / offline mode
    }

    // Client-side compressed Data URL
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
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/references', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`/api/references/${numId}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const item = await res.json();
        return this.normalizeReference(item);
      }
    } catch (err) {}
    const all = await this.getAll();
    return all.find(r => r.id === numId) || null;
  }

  async create(refData, token = null) {
    const payload = { ...refData };
    if (payload.images && Array.isArray(payload.images)) {
      payload.images = payload.images.slice(0, 20);
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/references', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const created = await res.json();
        this.normalizeReference(created);
        const local = this.getLocalReferences();
        local.push(created);
        this.saveLocalReferences(local);
        return created;
      }
    } catch (err) {
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
      const res = await fetch(`/api/references/${numId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        this.normalizeReference(updated);
        const idx = local.findIndex(r => r.id === numId);
        if (idx !== -1) local[idx] = updated;
        this.saveLocalReferences(local);
        return updated;
      }
    } catch (err) {
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
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/references/${numId}`, {
        method: 'DELETE',
        headers
      });
    } catch (err) {
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new PageController();
  
  app.registerComponent(new Navbar('.navbar'));
  app.registerComponent(new ImageSlider('.hero-slider'));
  app.registerComponent(new BackdropAnimation()); // Register the geometric backdrop
  
  app.initAll();
  
  // Initialize cart badge
  window.cart.updateCartBadge();
});
