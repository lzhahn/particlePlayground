import { tsParticles } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import { 
  REPULSE_RADIUS,
  TS_FPS_LIMIT,
  TS_PARTICLE_SIZE_MIN,
  TS_PARTICLE_SIZE_MAX,
  TS_PARTICLE_SPEED,
  TS_PARTICLE_TRAIL_LENGTH,
  TS_PARTICLE_ROTATION_SPEED,
  TS_EMITTER_RATE_DELAY,
  TS_EMITTER_RATE_QUANTITY,
  STAR_COLOR
} from './constants';
import { PlanetSystem } from './planetSystem';

export class App {
  private container: HTMLElement | null;
  private cursorIndicator: HTMLDivElement | null = null;
  private planetSystem: PlanetSystem | null = null;
  private draggedItemType: string | null = null;
  private selectedItemType: string | null = null;
  private isShiftDragging: boolean = false;
  private shiftDragStart: { x: number; y: number } | null = null;
  private previewCircle: HTMLDivElement | null = null;

  constructor() {
    this.container = document.getElementById('app');
  }

  async init(): Promise<void> {
    if (!this.container) {
      console.error('App container not found');
      return;
    }

    await this.initParticles();
    this.render();
    this.initCursorIndicator();
    this.initPlanetSystem();
    this.setupRepulsorToggle();
    this.setupShiftClickDrag();
  }

  private setupRepulsorToggle(): void {
    const repulsorToggle = document.getElementById('repulsor-toggle') as HTMLInputElement;
    const repulsorContainer = repulsorToggle?.parentElement;
    
    if (repulsorToggle && this.planetSystem) {
      repulsorToggle.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (this.planetSystem) {
          this.planetSystem.setRepulsorEnabled(target.checked);
        }
        // Show/hide cursor indicator
        if (this.cursorIndicator) {
          this.cursorIndicator.style.display = target.checked ? 'block' : 'none';
        }
      });
      
      // Prevent clicks on the toggle from triggering particle burst
      if (repulsorContainer) {
        repulsorContainer.addEventListener('mousedown', (e) => {
          e.stopPropagation();
        });
        repulsorContainer.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    }
  }

  private initPlanetSystem(): void {
    const particlesContainer = document.getElementById('tsparticles');
    if (particlesContainer) {
      this.planetSystem = new PlanetSystem(particlesContainer);
    }
  }

  private setupShiftClickDrag(): void {
    // Click on palette items to select them
    const paletteItems = document.querySelectorAll('.palette-item');
    paletteItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const itemType = target.dataset.itemType;
        
        // Toggle selection
        if (this.selectedItemType === itemType) {
          this.selectedItemType = null;
          paletteItems.forEach(i => i.classList.remove('selected'));
        } else {
          this.selectedItemType = itemType || null;
          paletteItems.forEach(i => i.classList.remove('selected'));
          target.classList.add('selected');
        }
      });
    });

    // Click to place generators, Shift+drag for sized items
    document.addEventListener('mousedown', (e) => {
      if (!this.selectedItemType) return;
      
      // Don't interfere with UI elements
      const target = e.target as HTMLElement;
      if (target.closest('.info-box') || target.closest('.item-palette') || 
          target.closest('.settings-panel') || target.closest('.settings-button')) {
        return;
      }
      
      // Generators don't need sizing - place immediately on click (no shift needed)
      if (this.selectedItemType === 'generator') {
        if (this.planetSystem) {
          this.planetSystem.createGeneratorFromDrag(e.pageX, e.pageY);
        }
        return;
      }
      
      // For other items, require shift key for sizing
      if (!e.shiftKey) return;
      
      this.isShiftDragging = true;
      this.shiftDragStart = { x: e.pageX, y: e.pageY };
      
      // Create preview circle
      this.previewCircle = document.createElement('div');
      this.previewCircle.className = 'size-preview-circle';
      this.previewCircle.style.left = `${e.pageX}px`;
      this.previewCircle.style.top = `${e.pageY}px`;
      this.previewCircle.style.width = '0px';
      this.previewCircle.style.height = '0px';
      document.body.appendChild(this.previewCircle);
      
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isShiftDragging || !this.shiftDragStart || !this.previewCircle) return;
      
      const dx = e.pageX - this.shiftDragStart.x;
      const dy = e.pageY - this.shiftDragStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const radius = Math.max(20, Math.min(distance, 200)); // Clamp between 20 and 200
      
      this.previewCircle.style.width = `${radius * 2}px`;
      this.previewCircle.style.height = `${radius * 2}px`;
    });

    document.addEventListener('mouseup', (e) => {
      if (!this.isShiftDragging || !this.shiftDragStart || !this.previewCircle) return;
      
      const dx = e.pageX - this.shiftDragStart.x;
      const dy = e.pageY - this.shiftDragStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const radius = Math.max(20, Math.min(distance, 200)); // Clamp between 20 and 200
      
      // Place the item if we have a valid size
      if (radius >= 20 && this.planetSystem && this.selectedItemType) {
        const x = this.shiftDragStart.x;
        const y = this.shiftDragStart.y;
        
        if (this.selectedItemType === 'planet') {
          this.planetSystem.createPlanetFromDrag(x, y, radius);
        } else if (this.selectedItemType === 'sparkle-zone') {
          this.planetSystem.createSparkleZoneFromDrag(x, y, radius);
        } else if (this.selectedItemType === 'resetter-field') {
          this.planetSystem.createResetterFieldFromDrag(x, y, radius);
        }
      }
      
      // Cleanup
      this.previewCircle.remove();
      this.previewCircle = null;
      this.isShiftDragging = false;
      this.shiftDragStart = null;
    });
  }

  private setupDragAndDrop(): void {
    const dragAreas = document.querySelectorAll('.drag-area');
    
    dragAreas.forEach(dragArea => {
      dragArea.addEventListener('dragstart', (e) => {
        const dragEvent = e as DragEvent;
        const target = dragEvent.target as HTMLElement;
        const paletteItem = target.closest('.palette-item') as HTMLElement;
        
        this.draggedItemType = paletteItem?.dataset.itemType || null;
        
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.effectAllowed = 'copy';
        }
      });
      
      dragArea.addEventListener('dragend', () => {
        this.draggedItemType = null;
      });
    });
    
    // Allow drop on the entire document
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    });
    
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      
      if (!this.draggedItemType || !this.planetSystem) return;
      
      const x = e.pageX;
      const y = e.pageY;
      
      // Place the item based on type with default size (100px)
      if (this.draggedItemType === 'planet') {
        this.planetSystem.createPlanetFromDrag(x, y, 100);
      } else if (this.draggedItemType === 'generator') {
        this.planetSystem.createGeneratorFromDrag(x, y);
      } else if (this.draggedItemType === 'sparkle-zone') {
        this.planetSystem.createSparkleZoneFromDrag(x, y, 100);
      } else if (this.draggedItemType === 'resetter-field') {
        this.planetSystem.createResetterFieldFromDrag(x, y, 100);
      }
      
      this.draggedItemType = null;
    });
  }

  private async initParticles(): Promise<void> {
    await loadSlim(tsParticles);

    // Make tsParticles globally accessible for planet system
    (window as any).tsParticles = tsParticles;

    await tsParticles.load({
      id: 'tsparticles',
      options: {
        background: {
          color: {
            value: '#0d1117',
          },
        },
        backgroundMask: {
          enable: false,
        },
        fpsLimit: TS_FPS_LIMIT,
        fullScreen: {
          enable: false,
        },
        
        particles: {
          color: {
            value: STAR_COLOR,
          },
          links: {
            enable: false,
          },
          move: {
            direction: 'bottom-right',
            enable: true,
            outModes: {
              default: 'out',
            },
            random: false,
            speed: TS_PARTICLE_SPEED,
            straight: true,
            trail: {
              enable: false,
              length: TS_PARTICLE_TRAIL_LENGTH,
              fill: {
                color: 'rgba(13, 17, 23, 0.02)',
              },
            },
          },
          number: {
            density: {
              enable: true,
            },
            value: 0,
          },
          opacity: {
            value: 1,
          },
          shape: {
            type: 'star',
            options: {
              star: {
                sides: 5,
              },
            },
          },
          size: {
            value: { min: TS_PARTICLE_SIZE_MIN, max: TS_PARTICLE_SIZE_MAX },
          },
          rotate: {
            value: {
              min: 0,
              max: 360,
            },
            animation: {
              enable: true,
              speed: TS_PARTICLE_ROTATION_SPEED,
              sync: false,
            },
          },
          collisions: {
            enable: true,
            mode: 'bounce',
          },
        },
        emitters: [
          // Top edge - emit downward-right
          {
            direction: 'bottom-right',
            rate: {
              delay: TS_EMITTER_RATE_DELAY,
              quantity: TS_EMITTER_RATE_QUANTITY,
            },
            size: {
              width: 100,
              height: 0,
            },
            position: {
              x: 50,
              y: 0,
            },
          },
          // Left edge - emit downward-right
          {
            direction: 'bottom-right',
            rate: {
              delay: TS_EMITTER_RATE_DELAY,
              quantity: TS_EMITTER_RATE_QUANTITY,
            },
            size: {
              width: 0,
              height: 100,
            },
            position: {
              x: 0,
              y: 50,
            },
          },
          // Right edge - emit downward-left
          {
            direction: 'bottom-left',
            rate: {
              delay: TS_EMITTER_RATE_DELAY,
              quantity: TS_EMITTER_RATE_QUANTITY,
            },
            size: {
              width: 0,
              height: 100,
            },
            position: {
              x: 100,
              y: 50,
            },
          },
          // Bottom edge - emit upward-right initially
          {
            direction: 'top-right',
            rate: {
              delay: TS_EMITTER_RATE_DELAY,
              quantity: TS_EMITTER_RATE_QUANTITY,
            },
            size: {
              width: 100,
              height: 0,
            },
            position: {
              x: 50,
              y: 100,
            },
          },
        ],
        detectRetina: true,
      },
    });
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="info-box" id="info-box">
        <div class="info-header" id="info-header">
          <h2 style="margin: 0; font-size: 1.2em;">Particle Playground</h2>
          <button id="toggle-info" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.5em; padding: 0; width: 30px; height: 30px;">−</button>
        </div>
        <div class="info-content" id="info-content">
          <p style="font-size: 0.9em; margin: 0.5rem 0;">
            <strong>Click</strong> to select item, then <strong>Shift+Drag</strong> to set size<br>
            Or <strong>drag items</strong> from palette to place them<br>
            <strong>P</strong> = Remove planets • <strong>G</strong> = Remove generators • <strong>C</strong> = Clear all
          </p>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
            <label for="repulsor-toggle" style="font-size: 0.9em; flex: 1;">Mouse Repulsor</label>
            <input type="checkbox" id="repulsor-toggle" checked style="width: 18px; height: 18px; cursor: pointer;">
          </div>
        </div>
      </div>
      
      <div class="item-palette">
        <div class="palette-header">
          <h3 style="margin: 0; font-size: 1em;">Items</h3>
          <button id="toggle-palette" style="background: none; border: none; color: white; cursor: pointer; font-size: 1em; padding: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">−</button>
        </div>
        <div class="palette-items" id="palette-items">
          <div class="palette-item" data-item-type="planet">
            <div class="drag-area" draggable="true">
              <div class="item-icon planet-icon"></div>
              <span class="item-label">Planet</span>
            </div>
          </div>
          <div class="palette-item" data-item-type="generator">
            <div class="drag-area" draggable="true">
              <div class="item-icon generator-icon"></div>
              <span class="item-label">Generator</span>
            </div>
          </div>
          <div class="palette-item" data-item-type="sparkle-zone">
            <div class="drag-area" draggable="true">
              <div class="item-icon sparkle-zone-icon"></div>
              <span class="item-label">Sparkle Zone</span>
            </div>
          </div>
          <div class="palette-item" data-item-type="resetter-field">
            <div class="drag-area" draggable="true">
              <div class="item-icon resetter-field-icon"></div>
              <span class="item-label">Resetter Field</span>
            </div>
          </div>
          <div class="palette-instructions">
            <p style="font-size: 0.7em; color: rgba(255,255,255,0.6); margin: 0.5rem 0; text-align: center; line-height: 1.3;">
              Click to select<br>
              Shift+Drag to size
            </p>
          </div>
        </div>
      </div>
      <div class="settings-panel" id="settings-panel">
        <div class="settings-header">
          <h3 style="margin: 0; font-size: 1em;">Settings</h3>
          <button id="close-settings" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2em; padding: 0;">×</button>
        </div>
        <div class="settings-content">
          <div class="setting-group">
            <label style="font-size: 0.85em; color: rgba(255,255,255,0.9); margin-bottom: 0.5rem; display: block;">Particle Colors</label>
            <div class="color-schemes">
              <button class="color-scheme-btn active" data-scheme="moonlight">
                <span class="scheme-preview" style="background: linear-gradient(135deg, #e8e6e3 50%, #ffd700 50%);"></span>
                <span class="scheme-name">Moonlight</span>
              </button>
              <button class="color-scheme-btn" data-scheme="sunset">
                <span class="scheme-preview" style="background: linear-gradient(135deg, #ffa07a 50%, #ff6b9d 50%);"></span>
                <span class="scheme-name">Sunset</span>
              </button>
              <button class="color-scheme-btn" data-scheme="ocean">
                <span class="scheme-preview" style="background: linear-gradient(135deg, #b0e0e6 50%, #40e0d0 50%);"></span>
                <span class="scheme-name">Ocean</span>
              </button>
              <button class="color-scheme-btn" data-scheme="lavender">
                <span class="scheme-preview" style="background: linear-gradient(135deg, #e6e6fa 50%, #dda0dd 50%);"></span>
                <span class="scheme-name">Lavender</span>
              </button>
              <button class="color-scheme-btn" data-scheme="mint">
                <span class="scheme-preview" style="background: linear-gradient(135deg, #f0fff0 50%, #98fb98 50%);"></span>
                <span class="scheme-name">Mint</span>
              </button>
              <button class="color-scheme-btn" data-scheme="rose">
                <span class="scheme-preview" style="background: linear-gradient(135deg, #fff5ee 50%, #b76e79 50%);"></span>
                <span class="scheme-name">Rose Gold</span>
              </button>
              <button class="color-scheme-btn" data-scheme="cosmic">
                <span class="scheme-preview" style="background: linear-gradient(135deg, #f8f8ff 50%, #da70d6 50%);"></span>
                <span class="scheme-name">Cosmic</span>
              </button>
            </div>
          </div>
          <button id="reset-button" style="margin-top: 1rem; padding: 0.75rem 1rem; cursor: pointer; background: rgba(255, 80, 80, 0.2); border: 2px solid rgba(255, 80, 80, 0.5); color: white; border-radius: 8px; font-size: 0.9em; transition: all 0.3s ease; width: 100%;">
            Reset All
          </button>
        </div>
      </div>
      <button id="settings-button" class="settings-button">⚙️</button>
    `;

    // Add toggle button event listener
    const toggleButton = document.getElementById('toggle-info');
    const infoContent = document.getElementById('info-content');
    const infoBox = document.getElementById('info-box');
    
    if (toggleButton && infoContent) {
      toggleButton.addEventListener('click', () => {
        if (infoContent.style.display === 'none') {
          infoContent.style.display = 'block';
          toggleButton.textContent = '−';
        } else {
          infoContent.style.display = 'none';
          toggleButton.textContent = '+';
        }
      });
    }
    
    // Prevent clicks in info box from triggering particle burst
    if (infoBox) {
      infoBox.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      infoBox.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Add palette toggle button event listener
    const togglePalette = document.getElementById('toggle-palette');
    const paletteItems = document.getElementById('palette-items');
    
    if (togglePalette && paletteItems) {
      togglePalette.addEventListener('click', () => {
        if (paletteItems.style.display === 'none') {
          paletteItems.style.display = 'flex';
          togglePalette.textContent = '−';
        } else {
          paletteItems.style.display = 'none';
          togglePalette.textContent = '+';
        }
      });
    }

    // Setup drag and drop for palette items
    this.setupDragAndDrop();

    // Setup settings panel
    this.setupSettingsPanel();

    // Add reset button event listener
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        if (this.planetSystem) {
          const tsParticlesInstance = (window as any).tsParticles;
          if (tsParticlesInstance) {
            const container = tsParticlesInstance.domItem(0);
            if (container) {
              const canvas = container.canvas?.element;
              if (canvas) {
                const canvasRect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / canvasRect.width;
                const scaleY = canvas.height / canvasRect.height;
                
                const particles = container.particles?.array || 
                                 container.particles?._array || 
                                 container._particles?.array ||
                                 [];
                
                // Pop particles in waves as they're removed
                particles.forEach((particle: any, index: number) => {
                  if (particle.position) {
                    setTimeout(() => {
                      const pageX = (particle.position.x / scaleX) + canvasRect.left + window.scrollX;
                      const pageY = (particle.position.y / scaleY) + canvasRect.top + window.scrollY;
                      this.planetSystem!.createPopEffect(pageX, pageY);
                    }, index * 2); // Stagger pops by 2ms each
                  }
                });
              }
            }
          }
          
          // Pop planets, generators, and sparkle zones with delays
          let delay = 0;
          if ((this.planetSystem as any).planets) {
            (this.planetSystem as any).planets.forEach((planet: any) => {
              setTimeout(() => {
                this.planetSystem!.createPopEffect(planet.x, planet.y);
              }, delay);
              delay += 50;
            });
          }
          if ((this.planetSystem as any).generators) {
            (this.planetSystem as any).generators.forEach((generator: any) => {
              setTimeout(() => {
                this.planetSystem!.createPopEffect(generator.x, generator.y);
              }, delay);
              delay += 50;
            });
          }
          if ((this.planetSystem as any).sparkleZones) {
            (this.planetSystem as any).sparkleZones.forEach((zone: any) => {
              setTimeout(() => {
                this.planetSystem!.createPopEffect(zone.x, zone.y);
              }, delay);
              delay += 50;
            });
          }
          
          // Reset immediately so items disappear as pops appear
          this.planetSystem!.reset();
        }
      });
      
      // Add hover effect
      resetButton.addEventListener('mouseenter', () => {
        resetButton.style.background = 'rgba(255, 80, 80, 0.3)';
        resetButton.style.borderColor = 'rgba(255, 80, 80, 0.7)';
      });
      resetButton.addEventListener('mouseleave', () => {
        resetButton.style.background = 'rgba(255, 80, 80, 0.2)';
        resetButton.style.borderColor = 'rgba(255, 80, 80, 0.5)';
      });
    }
  }

  private initCursorIndicator(): void {
    this.cursorIndicator = document.createElement('div');
    this.cursorIndicator.id = 'cursor-indicator';
    const diameter = REPULSE_RADIUS * 2;
    this.cursorIndicator.style.width = `${diameter}px`;
    this.cursorIndicator.style.height = `${diameter}px`;
    document.body.appendChild(this.cursorIndicator);

    document.addEventListener('mousemove', (e) => {
      if (this.cursorIndicator) {
        this.cursorIndicator.style.left = `${e.clientX}px`;
        this.cursorIndicator.style.top = `${e.clientY}px`;
      }
    });

    document.addEventListener('mouseleave', () => {
      if (this.cursorIndicator) {
        this.cursorIndicator.style.opacity = '0';
      }
    });

    document.addEventListener('mouseenter', () => {
      if (this.cursorIndicator) {
        this.cursorIndicator.style.opacity = '1';
      }
    });
  }

  private setupSettingsPanel(): void {
    const settingsButton = document.getElementById('settings-button');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettings = document.getElementById('close-settings');

    if (settingsButton && settingsPanel) {
      // Toggle settings panel
      settingsButton.addEventListener('click', () => {
        settingsPanel.classList.toggle('open');
      });

      // Close settings panel
      if (closeSettings) {
        closeSettings.addEventListener('click', () => {
          settingsPanel.classList.remove('open');
        });
      }

      // Color scheme definitions
      const colorSchemes: { [key: string]: { star: string; glitter: string; planet: string; generator: string; resetterField: string; background: string } } = {
        moonlight: { star: '#e8e6e3', glitter: '#ffd700', planet: '#ffffff', generator: '#00ffff', resetterField: '#00ff00', background: '#0d1117' },
        sunset: { star: '#ffa07a', glitter: '#ff6b9d', planet: '#ff8c42', generator: '#ff6b9d', resetterField: '#ffaa00', background: '#2d1b2e' },
        ocean: { star: '#b0e0e6', glitter: '#40e0d0', planet: '#4a90e2', generator: '#00d4ff', resetterField: '#00ffaa', background: '#0a1929' },
        lavender: { star: '#e6e6fa', glitter: '#dda0dd', planet: '#c8a2d0', generator: '#b19cd9', resetterField: '#9370db', background: '#1a1625' },
        mint: { star: '#f0fff0', glitter: '#98fb98', planet: '#b8e6b8', generator: '#7ed957', resetterField: '#00ff7f', background: '#0f1e13' },
        rose: { star: '#fff5ee', glitter: '#b76e79', planet: '#f4c2c2', generator: '#d4a5a5', resetterField: '#ff69b4', background: '#1e1214' },
        cosmic: { star: '#f8f8ff', glitter: '#da70d6', planet: '#9d4edd', generator: '#c77dff', resetterField: '#ff00ff', background: '#0d0221' }
      };

      // Color scheme buttons
      const schemeButtons = document.querySelectorAll('.color-scheme-btn');
      schemeButtons.forEach(button => {
        button.addEventListener('click', () => {
          const scheme = (button as HTMLElement).dataset.scheme;
          if (!scheme || !colorSchemes[scheme]) return;

          // Update active state
          schemeButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');

          const colors = colorSchemes[scheme];

          // Update background and star color
          const tsParticlesInstance = (window as any).tsParticles;
          if (tsParticlesInstance) {
            const container = tsParticlesInstance.domItem(0);
            if (container && container.options) {
              // Update background color in options
              if (container.options.background && container.options.background.color) {
                container.options.background.color.value = colors.background;
              }
              
              // Also update canvas background directly
              const canvas = container.canvas?.element;
              if (canvas) {
                canvas.style.backgroundColor = colors.background;
              }
              
              // Update star color
              container.options.particles.color.value = colors.star;
              
              // Create pop effects on all visible particles
              if (canvas && this.planetSystem) {
                const canvasRect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / canvasRect.width;
                const scaleY = canvas.height / canvasRect.height;
                
                const particles = container.particles?.array || 
                                 container.particles?._array || 
                                 container._particles?.array ||
                                 [];
                
                // Create pop on all particles
                particles.forEach((particle: any) => {
                  if (particle.position) {
                    const pageX = (particle.position.x / scaleX) + canvasRect.left + window.scrollX;
                    const pageY = (particle.position.y / scaleY) + canvasRect.top + window.scrollY;
                    (this.planetSystem as any).createPopEffect(pageX, pageY);
                  }
                });
              }
              
              container.refresh();
            }
          }

          // Update glitter color
          if (this.planetSystem) {
            (this.planetSystem as any).glitterColor = colors.glitter;
          }

          // Update planet colors
          const planetColor = colors.planet;
          document.querySelectorAll('.planet-core').forEach((planet: Element) => {
            (planet as HTMLElement).style.background = `radial-gradient(circle, ${planetColor} 0%, ${planetColor}88 100%)`;
            (planet as HTMLElement).style.boxShadow = `0 0 20px ${planetColor}, inset 0 0 10px ${planetColor}`;
          });

          // Update generator colors
          const generatorColor = colors.generator;
          const genRgb = parseInt(generatorColor.slice(1), 16);
          const genR = (genRgb >> 16) & 255;
          const genG = (genRgb >> 8) & 255;
          const genB = genRgb & 255;
          document.querySelectorAll('.generator').forEach((generator: Element) => {
            (generator as HTMLElement).style.background = `radial-gradient(circle, rgba(${genR}, ${genG}, ${genB}, 0.8) 0%, rgba(${genR}, ${genG}, ${genB}, 0.3) 100%)`;
            (generator as HTMLElement).style.borderColor = `rgba(${genR}, ${genG}, ${genB}, 0.6)`;
            (generator as HTMLElement).style.boxShadow = `0 0 20px rgba(${genR}, ${genG}, ${genB}, 0.6), inset 0 0 10px rgba(${genR}, ${genG}, ${genB}, 0.4)`;
          });

          // Update resetter field colors
          const resetterFieldColor = colors.resetterField;
          const resetRgb = parseInt(resetterFieldColor.slice(1), 16);
          const resetR = (resetRgb >> 16) & 255;
          const resetG = (resetRgb >> 8) & 255;
          const resetB = resetRgb & 255;
          document.querySelectorAll('.resetter-field').forEach((field: Element) => {
            (field as HTMLElement).style.borderColor = `rgba(${resetR}, ${resetG}, ${resetB}, 0.5)`;
            (field as HTMLElement).style.background = `radial-gradient(circle, rgba(${resetR}, ${resetG}, ${resetB}, 0.1) 0%, rgba(${resetR}, ${resetG}, ${resetB}, 0.05) 50%, transparent 100%)`;
            (field as HTMLElement).style.boxShadow = `inset 0 0 30px rgba(${resetR}, ${resetG}, ${resetB}, 0.2), 0 0 20px rgba(${resetR}, ${resetG}, ${resetB}, 0.4)`;
          });

          // Update palette icon colors
          const planetIcon = document.querySelector('.planet-icon') as HTMLElement;
          if (planetIcon) {
            planetIcon.style.background = `radial-gradient(circle, ${planetColor} 0%, ${planetColor}88 100%)`;
            planetIcon.style.boxShadow = `0 0 10px ${planetColor}, inset 0 0 5px ${planetColor}`;
          }

          const generatorIcon = document.querySelector('.generator-icon') as HTMLElement;
          if (generatorIcon) {
            generatorIcon.style.background = `radial-gradient(circle, rgba(${genR}, ${genG}, ${genB}, 0.8) 0%, rgba(${genR}, ${genG}, ${genB}, 0.3) 100%)`;
            generatorIcon.style.borderColor = `rgba(${genR}, ${genG}, ${genB}, 0.6)`;
            generatorIcon.style.boxShadow = `0 0 10px rgba(${genR}, ${genG}, ${genB}, 0.6), inset 0 0 5px rgba(${genR}, ${genG}, ${genB}, 0.4)`;
          }

          const resetterFieldIcon = document.querySelector('.resetter-field-icon') as HTMLElement;
          if (resetterFieldIcon) {
            resetterFieldIcon.style.background = `radial-gradient(circle, rgba(${resetR}, ${resetG}, ${resetB}, 0.4) 0%, rgba(${resetR}, ${resetG}, ${resetB}, 0.2) 100%)`;
            resetterFieldIcon.style.borderColor = `rgba(${resetR}, ${resetG}, ${resetB}, 0.6)`;
            resetterFieldIcon.style.boxShadow = `0 0 15px rgba(${resetR}, ${resetG}, ${resetB}, 0.5)`;
          }
        });
      });
    }
  }
}
