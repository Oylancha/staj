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
