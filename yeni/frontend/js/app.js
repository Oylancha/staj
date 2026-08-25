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
    alert(`${qty} adet ${name} sepete eklendi.`);
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
    parent_id: null,
    manual_url: null
  },
  {
    id: 9,
    name: "Ped De-icing",
    description: "Sac antenler için tasarladığımız yenilikçi Ped De-icing sistemimiz, arkası yapışkanlı ve pratik bir yapıya sahiptir. Antenin arka yüzeyine kolayca yapıştırılarak uygulanır ve üzeri izolasyon sağlayan çamur bant ile tamamen kapatılır. Isıtıcı ped, anten yüzeyi ile doğrudan fiziksel temas halinde olduğu için ısıyı minimum kayıpla metale aktarır, böylece hem çok hızlı hem de son derece enerji tasarruflu bir buz çözme deneyimi sunar.",
    image_url: "images/panel.bmp",
    parent_id: null,
    manual_url: null
  },
  {
    id: 10,
    name: "Sensör X",
    description: "Modern endüstriyel tesislerin dijitalleşmesine öncülük eden Sensör X, sahadaki donanımlarınızı masaüstünüze taşıyor. RS485 haberleşme protokolü kullanan bu modül, işletmenizdeki ana bilgisayarlara bağlanarak fiziksel panoların sanal ortamdan izlenmesine ve yönetilmesine olanak tanır. Gerçek zamanlı veri akışı ve güvenli iletişim altyapısı ile merkezi kontrol merkezleri için vazgeçilmez bir araçtır.",
    image_url: "images/IMG_2004.JPG",
    parent_id: null,
    manual_url: null
  },
  {
    id: 11,
    name: "Sensör 5",
    description: "Şebeke voltajı ile çalışabilen Sensör 5, 20 ampere kadar güçlü ve stabil kontrol sağlayan gelişmiş bir pano modülüdür. Yüksek akım ihtiyacı olan sistemlerde, sensörler ve kontrol elemanları kolaylıkla ek panolara taşınabilir. Bu esnek mimari sayesinde kurulumu ve bakımı son derece kolaydır. Aşırı yük koruması ve dalgalanmalara karşı entegre güvenlik sistemleri ile donatılmıştır.",
    image_url: "images/fotograf-0802.jpg",
    parent_id: null,
    manual_url: null
  },
  {
    id: 12,
    name: "Radom De-icing",
    description: "Anten yapısına tam uyumlu şekilde, özel dikiş teknikleri kullanılarak yan çeperden sarılan Radom De-icing sistemimiz, antenleri kar, buz ve şiddetli rüzgara karşı korumak için tasarlanmıştır. Genelde spesifik ebatlar ve projeler için özel olarak ölçülendirilir. Radom içerisindeki sıcaklığı stabilize ederek sinyal kaybını sıfıra indirir.",
    image_url: "images/IMG_3694.JPG",
    parent_id: null,
    manual_url: null
  },
  {
    id: 13,
    name: "Branda De-icing",
    description: "Çift yüz silikon kaplı ve çapraz cam elyaf dokumalı özel yapısıyla Branda De-icing, standart dışı anten boyutları için esnek ve pratik bir çözüm sunar. İstenilen her ebatta üretilebilen bu özel dokuma sistem, ısıyı yüzeye eşit oranda yayarak antenin ön yüzeyinde buzlanmayı engeller. Yüksek rüzgar ve zorlu hava koşullarına karşı ekstra direnç gösterecek şekilde güçlendirilmiştir.",
    image_url: "images/DSC04211.JPG",
    parent_id: null,
    manual_url: null
  },
  {
    id: 14,
    name: "Sensör D",
    description: "Doğal afet anlarında saniyeler bile hayati önem taşır. Sensör D; deprem, yangın, sel gibi acil durumlarda mekanlarda erken uyarı vermek ve sistem enerjisini güvenli bir şekilde kesmek üzere tasarlanmış akıllı bir sensör modülüdür. Gelişmiş sismik algılama algoritmaları sayesinde yanlış alarmları önler ve gerçek risk anlarında devreye girerek olası yangın ve elektrik hasarlarının önüne geçer.",
    image_url: "images/IMG_3723.JPG",
    parent_id: null,
    manual_url: null
  },
  {
    id: 15,
    name: "Blower De-icing",
    description: "Zorlu kış şartlarında TV ve uydu yayınlarının kesintiye uğramasını önlemek için geliştirilmiş yenilikçi sistemimizdir. Blower De-icing, antenin arka yüzeyine monte edilen yüksek kapasiteli fanlar (blower) yardımıyla, üretilen sıcak havanın anten çeperlerinde sürekli sirkülasyonunu sağlar. Bu sayede kar ve buz birikimi oluşmadan engellenir ve antenin sinyal iletkenliği her koşulda güvence altına alınır.",
    image_url: "images/DSC04173.JPG",
    parent_id: null,
    manual_url: null
  },
  {
    id: 16,
    name: "Sensor XA",
    description: "Test ve optimizasyon çalışmaları için modüler olarak tasarlanmış yüksek duyarlılığa sahip ikincil sensör modülü.",
    image_url: "images/e581dac21d9b414fac9b37402bde72a2.JPG",
    parent_id: 10,
    manual_url: null
  },
  {
    id: 17,
    name: "Sensor Manual",
    description: "Entegre teknik kılavuzu ve RS485 haberleşme dokümantasyonu bulunan akıllı kontrol ünitesi.",
    image_url: "images/e846771abfab4955af93ce6185f0ccdf.JPG",
    parent_id: 11,
    manual_url: "images/0673ebaecf1149dfaec5cd7af5f1ba6e.pdf"
  }
];

/**
 * ProductService manages products seamlessly across API and LocalStorage fallback
 */
class ProductService {
  constructor() {
    this.storageKey = 'ikies_products';
  }

  getLocalProducts() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read products from localStorage:", e);
    }
    // Initialize with default products
    this.saveLocalProducts(DEFAULT_PRODUCTS);
    return DEFAULT_PRODUCTS;
  }

  saveLocalProducts(products) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(products));
    } catch (e) {
      console.warn("Could not save products to localStorage:", e);
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
          this.saveLocalProducts(products);
          return products;
        }
      }
    } catch (err) {
      // Backend not running or static environment
      console.info("Using local product catalog (Backend offline or static mode).");
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

    const all = this.getLocalProducts();
    return all.find(p => p.id === numId) || null;
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
        const local = this.getLocalProducts();
        local.push(created);
        this.saveLocalProducts(local);
        return created;
      }
    } catch (err) {
      console.info("Creating product in local storage mode.");
    }

    // Offline / Fallback creation
    const local = this.getLocalProducts();
    const newId = local.length > 0 ? Math.max(...local.map(p => p.id || 0)) + 1 : 1;
    const newProduct = {
      id: newId,
      name: productData.name,
      description: productData.description || '',
      image_url: productData.image_url || 'images/placeholder.svg',
      manual_url: productData.manual_url || null,
      parent_id: productData.parent_id ? parseInt(productData.parent_id, 10) : null
    };
    local.push(newProduct);
    this.saveLocalProducts(local);
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

    let local = this.getLocalProducts();
    local = local.filter(p => p.id !== numId);
    // Unparent any children
    local.forEach(p => {
      if (p.parent_id === numId) p.parent_id = null;
    });
    this.saveLocalProducts(local);
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
        let local = this.getLocalProducts();
        const idx = local.findIndex(p => p.id === numId);
        if (idx !== -1) local[idx] = updated;
        this.saveLocalProducts(local);
        return updated;
      }
    } catch (err) {
      console.info("Updating product in local storage mode.");
    }

    // Offline fallback
    let local = this.getLocalProducts();
    const idx = local.findIndex(p => p.id === numId);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...productData, id: numId };
      this.saveLocalProducts(local);
      return local[idx];
    }
    return null;
  }

  async uploadFile(file) {
    if (!file) return null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (err) {
      console.info("Backend upload failed, converting to local data URI.");
    }

    // Fallback: Read file as Data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve('images/placeholder.svg');
      reader.readAsDataURL(file);
    });
  }
}

// Global ProductService instance
window.ProductService = new ProductService();

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
