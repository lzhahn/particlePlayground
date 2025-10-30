import { 
  PLANET_CORE_SIZE,
  PLANET_HIT_RADIUS,
  REPULSE_RADIUS,
  GRAVITY_STRENGTH, 
  GRAVITY_MASS,
  PARTICLE_BASE_SPEED, 
  PARTICLE_MAX_SPEED, 
  PARTICLE_FRICTION,
  PARTICLE_DIAGONAL_VX,
  PARTICLE_DIAGONAL_VY,
  GENERATOR_EMIT_INTERVAL,
  GENERATOR_PARTICLE_SPEED,
  GENERATOR_TRANSITION_DURATION,
  GLITTER_SPAWN_CHANCE,
  GLITTER_SIZE_MIN,
  GLITTER_SIZE_MAX,
  GLITTER_SIZE_FACTOR,
  GLITTER_SPEED_MIN,
  GLITTER_SPEED_MAX,
  GLITTER_SPREAD_ANGLE,
  GLITTER_SPIN_MULTIPLIER,
  GLITTER_DURATION,
  CANVAS_OFFSCREEN_BUFFER,
  MAX_PLANETS,
  MAX_GENERATORS,
  MAX_SPARKLE_ZONES,
  MAX_RESETTER_FIELDS,
  MAX_PARTICLES,
  PHYSICS_FRAME_SKIP,
  FADE_OUT_DURATION,
  BURST_PARTICLE_COUNT,
  BURST_SPEED_MIN,
  BURST_SPEED_MAX,
  MOUSE_VELOCITY_TRANSFER,
  MOUSE_VELOCITY_TRANSFER_TS,
  SPARKLE_ZONE_SPAWN_MULTIPLIER,
  POP_DURATION,
  POP_SIZE,
  GLITTER_COLOR_GOLD,
  GLITTER_COLORS_RAINBOW
} from './constants';

interface Planet {
  x: number;
  y: number;
  radius: number;
  element: HTMLDivElement;
}

interface Generator {
  x: number;
  y: number;
  element: HTMLDivElement;
  lastEmitTime: number;
}

interface EmittedParticle {
  particle: any;
  birthTime: number;
  initialVX: number;
  initialVY: number;
}

interface SparkleZone {
  x: number;
  y: number;
  radius: number;
  element: HTMLDivElement;
}

interface ResetterField {
  x: number;
  y: number;
  radius: number;
  element: HTMLDivElement;
}

export class PlanetSystem {
  private planets: Planet[] = [];
  private generators: Generator[] = [];
  private sparkleZones: SparkleZone[] = [];
  private resetterFields: ResetterField[] = [];
  private emittedParticles: EmittedParticle[] = [];
  private container: HTMLElement;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private previewCircle: HTMLDivElement | null = null;
  private animationFrame: number | null = null;
  private glitterContainer: HTMLDivElement;
  private mouseX = 0;
  private mouseY = 0;
  private mouseVX: number = 0;
  private mouseVY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastMouseTime: number = Date.now();
  private repulsorEnabled: boolean = true;
  private frameCount: number = 0;
  private physicsFrameSkip: number = PHYSICS_FRAME_SKIP;
  public glitterColor: string = GLITTER_COLOR_GOLD;

  constructor(container: HTMLElement) {
    this.container = container;
    
    // Create glitter container
    this.glitterContainer = document.createElement('div');
    this.glitterContainer.id = 'glitter-container';
    this.glitterContainer.style.position = 'fixed';
    this.glitterContainer.style.top = '0';
    this.glitterContainer.style.left = '0';
    this.glitterContainer.style.width = '100%';
    this.glitterContainer.style.height = '100%';
    this.glitterContainer.style.pointerEvents = 'none';
    this.glitterContainer.style.zIndex = '1';
    document.body.appendChild(this.glitterContainer);
    
    this.init();
  }

  private init(): void {
    document.addEventListener('contextmenu', this.handleRightClick.bind(this));
    document.addEventListener('mousemove', this.trackMouseVelocity.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.startAnimation();
    
    // Create 2 random generators at start
    this.createRandomGenerators(2);
  }

  public setRepulsorEnabled(enabled: boolean): void {
    this.repulsorEnabled = enabled;
    
    // Disable tsParticles built-in repulse mode - we use custom physics instead
    const tsParticlesInstance = (window as any).tsParticles;
    if (tsParticlesInstance) {
      const container = tsParticlesInstance.domItem(0);
      if (container) {
        // Disable the built-in interactivity
        if (container.actualOptions?.interactivity?.events?.onHover) {
          container.actualOptions.interactivity.events.onHover.enable = false;
          container.actualOptions.interactivity.events.onHover.mode = [];
        }
        
        // Also update the options object
        if (container.options?.interactivity?.events?.onHover) {
          container.options.interactivity.events.onHover.enable = false;
          container.options.interactivity.events.onHover.mode = [];
        }
      }
    }
  }

  private createRandomGenerators(count: number): void {
    for (let i = 0; i < count; i++) {
      // Random position within the viewport
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      this.createGenerator(x, y);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Press 'P' to remove all planets
    if (e.key === 'p' || e.key === 'P') {
      this.removeAllPlanets();
    }
    // Press 'G' to remove all generators
    else if (e.key === 'g' || e.key === 'G') {
      this.removeAllGenerators();
    }
    // Press 'C' to clear all objects
    else if (e.key === 'c' || e.key === 'C') {
      this.clearAllObjects();
    }
  }

  private removeAllPlanets(): void {
    for (const planet of this.planets) {
      planet.element.remove();
    }
    this.planets = [];
    document.querySelectorAll('.gravity-radius').forEach(el => el.remove());
  }

  private removeAllGenerators(): void {
    for (const generator of this.generators) {
      generator.element.remove();
    }
    this.generators = [];
    this.emittedParticles = [];
  }

  private removeAllSparkleZones(): void {
    for (const zone of this.sparkleZones) {
      zone.element.remove();
    }
    this.sparkleZones = [];
  }

  private removeAllResetterFields(): void {
    for (const field of this.resetterFields) {
      field.element.remove();
    }
    this.resetterFields = [];
  }

  private clearAllObjects(): void {
    this.removeAllPlanets();
    this.removeAllGenerators();
    this.removeAllSparkleZones();
    this.removeAllResetterFields();
  }

  private trackMouseVelocity(e: MouseEvent): void {
    const currentTime = Date.now();
    const dt = currentTime - this.lastMouseTime;
    
    if (dt > 0) {
      // Calculate velocity in pixels per millisecond
      this.mouseVX = (e.pageX - this.lastMouseX) / dt;
      this.mouseVY = (e.pageY - this.lastMouseY) / dt;
    }
    
    this.mouseX = e.pageX;
    this.mouseY = e.pageY;
    this.lastMouseX = e.pageX;
    this.lastMouseY = e.pageY;
    this.lastMouseTime = currentTime;
  }

  private handleMouseDown(e: MouseEvent): void {
    // Only create particle burst on left click (button 0)
    if (e.button === 0) {
      this.createParticleBurst(e.pageX, e.pageY);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.previewCircle) return;

    const dx = e.pageX - this.dragStartX;
    const dy = e.pageY - this.dragStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(distance, 200);

    this.previewCircle.style.width = `${radius * 2}px`;
    this.previewCircle.style.height = `${radius * 2}px`;
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.isDragging) return;

    const dx = e.pageX - this.dragStartX;
    const dy = e.pageY - this.dragStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(distance, 200);

    if (radius > 20) {
      this.createPlanet(this.dragStartX, this.dragStartY, radius);
    }

    // Remove preview circle
    if (this.previewCircle) {
      this.previewCircle.remove();
      this.previewCircle = null;
    }

    this.isDragging = false;
  }

  private handleRightClick(e: MouseEvent): void {
    e.preventDefault();
    // Right-click disabled - use drag and drop from palette instead
  }

  public createPlanetFromDrag(x: number, y: number, radius: number): void {
    // Create a planet at the drop location with specified size
    this.createPlanet(x, y, radius);
  }

  public createGeneratorFromDrag(x: number, y: number): void {
    this.createGenerator(x, y);
  }

  public createSparkleZoneFromDrag(x: number, y: number, radius: number): void {
    this.createSparkleZone(x, y, radius);
  }

  public createResetterFieldFromDrag(x: number, y: number, radius: number): void {
    this.createResetterField(x, y, radius);
  }

  public reset(): void {
    // Simply perform the reset - pops are handled by the caller
    this.performReset();
  }

  private fadeInParticles(): void {
    const tsParticlesInstance = (window as any).tsParticles;
    if (tsParticlesInstance) {
      const container = tsParticlesInstance.domItem(0);
      if (container) {
        const canvas = container.canvas?.element;
        if (canvas) {
          canvas.style.opacity = '0';
          canvas.classList.add('particle-fade-in');
          this.glitterContainer.classList.add('particle-fade-in');
          
          // Remove class after animation completes
          setTimeout(() => {
            canvas.classList.remove('particle-fade-in');
            canvas.style.opacity = '1';
            this.glitterContainer.classList.remove('particle-fade-in');
            this.glitterContainer.style.opacity = '1';
          }, 2000);
        }
      }
    }
  }

  private performReset(): void {
    // Remove all planet elements
    for (const planet of this.planets) {
      planet.element.remove();
    }
    this.planets = [];

    // Remove all generator elements
    for (const generator of this.generators) {
      generator.element.remove();
    }
    this.generators = [];

    // Remove all sparkle zones
    for (const zone of this.sparkleZones) {
      zone.element.remove();
    }
    this.sparkleZones = [];

    // Remove all resetter fields
    for (const field of this.resetterFields) {
      field.element.remove();
    }
    this.resetterFields = [];

    // Remove all gravity radius indicators
    document.querySelectorAll('.gravity-radius').forEach(el => el.remove());

    // Clear emitted particles tracking
    this.emittedParticles = [];

    // Clear and refresh tsParticles (fade-out already started)
    const tsParticlesInstance = (window as any).tsParticles;
    if (tsParticlesInstance) {
      const container = tsParticlesInstance.domItem(0);
      if (container) {
        // Clear all particles and glitter
        if (container.particles) {
          container.particles.clear();
        }
        this.glitterContainer.innerHTML = '';
        
        // Get the canvas element
        const canvas = container.canvas?.element;
        if (canvas) {
          // Ensure canvas stays invisible
          canvas.style.transition = 'none';
          canvas.style.opacity = '0';
          this.glitterContainer.style.transition = 'none';
          this.glitterContainer.style.opacity = '0';
          
          // Refresh container (this resets emitters)
          container.refresh();
        } else {
          container.refresh();
        }
      }
    }
  }

  private createPlanet(x: number, y: number, radius: number): void {
    // Limit to MAX_PLANETS
    if (this.planets.length >= MAX_PLANETS) {
      // Remove the oldest planet with fade-out animation
      const oldestPlanet = this.planets.shift();
      if (oldestPlanet) {
        oldestPlanet.element.classList.add('planet-fade-out');
        // Remove gravity indicators
        const gravityRadii = document.querySelectorAll('.gravity-radius');
        if (gravityRadii.length > 0) {
          gravityRadii[0].classList.add('planet-fade-out');
        }
        // Remove after animation completes
        setTimeout(() => {
          oldestPlanet.element.remove();
          if (gravityRadii.length > 0) gravityRadii[0].remove();
        }, FADE_OUT_DURATION);
      }
    }
    
    console.log(`Creating planet at: x=${x}, y=${y}, radius=${radius}`);
    
    // Create gravity radius indicator
    const gravityRadius = document.createElement('div');
    gravityRadius.className = 'gravity-radius';
    gravityRadius.style.left = `${x}px`;
    gravityRadius.style.top = `${y}px`;
    gravityRadius.style.width = `${radius * 2}px`;
    gravityRadius.style.height = `${radius * 2}px`;
    document.body.appendChild(gravityRadius);

    const planetElement = document.createElement('div');
    planetElement.className = 'planet-core';
    planetElement.style.left = `${x}px`;
    planetElement.style.top = `${y}px`;
    document.body.appendChild(planetElement);
    
    console.log(`Planet core positioned at: left=${planetElement.style.left}, top=${planetElement.style.top}`);

    this.planets.push({
      x,
      y,
      radius,
      element: planetElement,
    });
    
    console.log(`Planet stored with center: x=${x}, y=${y}`);
  }

  private createParticleBurst(x: number, y: number): void {
    const tsParticlesInstance = (window as any).tsParticles;
    if (!tsParticlesInstance) return;

    const container = tsParticlesInstance.domItem(0);
    if (!container) return;

    const canvas = container.canvas?.element;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;

    // Convert page coordinates to canvas coordinates
    const canvasX = (x - canvasRect.left - window.scrollX) * scaleX;
    const canvasY = (y - canvasRect.top - window.scrollY) * scaleY;

    // Create particles in random directions
    const particleCount = BURST_PARTICLE_COUNT;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = BURST_SPEED_MIN + Math.random() * (BURST_SPEED_MAX - BURST_SPEED_MIN);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const newParticle = container.particles.addParticle({
        x: canvasX,
        y: canvasY,
        vx,
        vy,
      });

      // Track this particle for velocity transition
      if (newParticle) {
        this.emittedParticles.push({
          particle: newParticle,
          birthTime: Date.now(),
          initialVX: vx,
          initialVY: vy,
        });
      }
    }
  }

  private createGenerator(x: number, y: number): void {
    // Limit to MAX_GENERATORS
    if (this.generators.length >= MAX_GENERATORS) {
      // Remove the oldest generator with fade-out animation
      const oldestGenerator = this.generators.shift();
      if (oldestGenerator) {
        oldestGenerator.element.classList.add('generator-fade-out');
        // Remove after animation completes
        setTimeout(() => {
          oldestGenerator.element.remove();
        }, FADE_OUT_DURATION);
      }
    }

    const generatorElement = document.createElement('div');
    generatorElement.className = 'generator';
    generatorElement.style.left = `${x}px`;
    generatorElement.style.top = `${y}px`;
    document.body.appendChild(generatorElement);

    this.generators.push({
      x,
      y,
      element: generatorElement,
      lastEmitTime: 0,
    });
  }

  private createSparkleZone(x: number, y: number, radius: number): void {
    // Limit to MAX_SPARKLE_ZONES
    if (this.sparkleZones.length >= MAX_SPARKLE_ZONES) {
      // Remove the oldest zone with fade-out animation
      const oldestZone = this.sparkleZones.shift();
      if (oldestZone) {
        oldestZone.element.classList.add('sparkle-zone-fade-out');
        // Remove after animation completes
        setTimeout(() => {
          oldestZone.element.remove();
        }, FADE_OUT_DURATION);
      }
    }

    const zoneElement = document.createElement('div');
    zoneElement.className = 'sparkle-zone';
    zoneElement.style.left = `${x}px`;
    zoneElement.style.top = `${y}px`;
    zoneElement.style.width = `${radius * 2}px`;
    zoneElement.style.height = `${radius * 2}px`;
    document.body.appendChild(zoneElement);

    this.sparkleZones.push({
      x,
      y,
      radius,
      element: zoneElement,
    });
  }

  private createResetterField(x: number, y: number, radius: number): void {
    // Limit to MAX_RESETTER_FIELDS
    if (this.resetterFields.length >= MAX_RESETTER_FIELDS) {
      // Remove the oldest field with fade-out animation
      const oldestField = this.resetterFields.shift();
      if (oldestField) {
        oldestField.element.classList.add('resetter-field-fade-out');
        // Remove after animation completes
        setTimeout(() => {
          oldestField.element.remove();
        }, FADE_OUT_DURATION);
      }
    }

    const fieldElement = document.createElement('div');
    fieldElement.className = 'resetter-field';
    fieldElement.style.left = `${x}px`;
    fieldElement.style.top = `${y}px`;
    fieldElement.style.width = `${radius * 2}px`;
    fieldElement.style.height = `${radius * 2}px`;
    document.body.appendChild(fieldElement);

    this.resetterFields.push({
      x,
      y,
      radius,
      element: fieldElement,
    });
  }

  private startAnimation(): void {
    const animate = () => {
      this.frameCount++;
      
      // Run physics calculations every N frames
      if (this.frameCount % this.physicsFrameSkip === 0) {
        this.updateParticles();
        this.applyMouseVelocityToTsParticles();
        // applyGravityToTsParticles and createGlitterTrail are now called inside updateParticles
      }
      
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  private updateParticles(): void {
    // Emit particles from generators
    this.updateGenerators();
    
    // Transition emitted particles from radial to diagonal
    this.transitionEmittedParticles();
    
    // Apply resetter fields
    this.applyResetterFields();
    
    // Early exit if no planets
    if (this.planets.length === 0) {
      this.applyGravityToTsParticles();
      this.createGlitterTrail();
      return;
    }
    
    // Apply gravity to tsParticles
    this.applyGravityToTsParticles();
    
    // Create glitter trail
    this.createGlitterTrail();
  }

  private updateGenerators(): void {
    const tsParticlesInstance = (window as any).tsParticles;
    if (!tsParticlesInstance) return;

    const container = tsParticlesInstance.domItem(0);
    if (!container) return;

    const canvas = container.canvas?.element;
    if (!canvas) return;

    // Check total particle count
    const particles = container.particles?.array || 
                     container.particles?._array || 
                     container._particles?.array ||
                     [];
    
    const atCapacity = particles.length >= MAX_PARTICLES;
    
    // Update generator visual state based on capacity
    for (const generator of this.generators) {
      if (atCapacity) {
        generator.element.classList.add('generator-disabled');
      } else {
        generator.element.classList.remove('generator-disabled');
      }
    }
    
    // Stop spawning if particle count exceeds MAX_PARTICLES
    if (particles.length >= MAX_PARTICLES) return;

    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;

    const currentTime = Date.now();

    for (const generator of this.generators) {
      // Emit particles every GENERATOR_EMIT_INTERVAL seconds
      if (currentTime - generator.lastEmitTime > GENERATOR_EMIT_INTERVAL) {
        // Convert generator page coordinates to canvas coordinates
        const canvasX = (generator.x - canvasRect.left - window.scrollX) * scaleX;
        const canvasY = (generator.y - canvasRect.top - window.scrollY) * scaleY;

        // Emit 1 particle in a random direction
        const angle = Math.random() * Math.PI * 2;
        const speed = GENERATOR_PARTICLE_SPEED;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        // Add particle to tsParticles at canvas coordinates
        const newParticle = container.particles.addParticle({
          x: canvasX,
          y: canvasY,
          vx,
          vy,
        });

        // Track this particle for velocity transition
        if (newParticle) {
          this.emittedParticles.push({
            particle: newParticle,
            birthTime: currentTime,
            initialVX: vx,
            initialVY: vy,
          });
        }
        generator.lastEmitTime = currentTime;
      }
    }
  }

  private transitionEmittedParticles(): void {
    const currentTime = Date.now();
    const transitionDuration = GENERATOR_TRANSITION_DURATION;
    const targetVX = PARTICLE_DIAGONAL_VX;
    const targetVY = PARTICLE_DIAGONAL_VY;

    const tsParticlesInstance = (window as any).tsParticles;
    const container = tsParticlesInstance?.domItem(0);
    const canvas = container?.canvas?.element;
    
    let canvasRect: DOMRect | undefined;
    let scaleX: number = 1;
    let scaleY: number = 1;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvasRect = rect;
      scaleX = canvas.width / rect.width;
      scaleY = canvas.height / rect.height;
    }

    // Filter out particles that have completed transition or been removed
    this.emittedParticles = this.emittedParticles.filter(ep => {
      const age = currentTime - ep.birthTime;
      
      if (age > transitionDuration) {
        return false; // Remove from tracking
      }

      if (!ep.particle || !ep.particle.velocity || !ep.particle.position) {
        return false; // Particle was removed
      }

      // Stop particles if near cursor (but only after 1 second grace period and if repulsor is enabled)
      if (canvas && canvasRect && age > 1000 && this.repulsorEnabled) {
        const mouseCanvasX = (this.mouseX - canvasRect.left - window.scrollX) * scaleX;
        const mouseCanvasY = (this.mouseY - canvasRect.top - window.scrollY) * scaleY;
        
        const dx = ep.particle.position.x - mouseCanvasX;
        const dy = ep.particle.position.y - mouseCanvasY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < REPULSE_RADIUS * scaleX && distance > 0) {
          // Calculate repulsion force based on inverse square law (stronger when closer)
          const distanceSquared = dx * dx + dy * dy;
          const repulseStrength = 50; // Strength multiplier
          const force = (repulseStrength * REPULSE_RADIUS * scaleX) / distanceSquared; // Inverse square force
          const normalizedDx = dx / distance;
          const normalizedDy = dy / distance;
          
          // Apply force as acceleration (bounce away from cursor)
          ep.particle.velocity.x += normalizedDx * force;
          ep.particle.velocity.y += normalizedDy * force;
          
          // If particle is very close to cursor (within 20% of radius), push it out immediately
          const minDistance = (REPULSE_RADIUS * scaleX) * 0.2;
          if (distance < minDistance) {
            // Teleport particle to minimum safe distance
            const pushOutDistance = minDistance - distance;
            ep.particle.position.x += normalizedDx * pushOutDistance;
            ep.particle.position.y += normalizedDy * pushOutDistance;
          }
          
          // Update initial velocity so transition continues from new velocity
          ep.initialVX = ep.particle.velocity.x;
          ep.initialVY = ep.particle.velocity.y;
          ep.birthTime = currentTime; // Reset transition
        }
      }

      const progress = age / transitionDuration;

      // Lerp from initial velocity to target velocity
      ep.particle.velocity.x = ep.initialVX + (targetVX - ep.initialVX) * progress;
      ep.particle.velocity.y = ep.initialVY + (targetVY - ep.initialVY) * progress;

      return true;
    });
  }

  private applyMouseVelocityToTsParticles(): void {
    if (!this.repulsorEnabled) return;
    
    const tsParticlesInstance = (window as any).tsParticles;
    if (!tsParticlesInstance) return;

    const container = tsParticlesInstance.domItem(0);
    if (!container) return;

    const canvas = container.canvas?.element;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;

    // Convert mouse position to canvas coordinates
    const mouseCanvasX = (this.mouseX - canvasRect.left - window.scrollX) * scaleX;
    const mouseCanvasY = (this.mouseY - canvasRect.top - window.scrollY) * scaleY;

    const particles = container.particles?.array || 
                     container.particles?._array || 
                     container._particles?.array ||
                     [];

    const repulseRadiusSquared = (REPULSE_RADIUS * scaleX) * (REPULSE_RADIUS * scaleX);

    for (const particle of particles) {
      if (!particle.position || !particle.velocity) continue;

      const dx = particle.position.x - mouseCanvasX;
      const dy = particle.position.y - mouseCanvasY;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < repulseRadiusSquared && distanceSquared > 0) {
        // Calculate repulsion force based on inverse square law (stronger when closer)
        const distance = Math.sqrt(distanceSquared);
        const repulseStrength = 50; // Strength multiplier
        const force = (repulseStrength * REPULSE_RADIUS * scaleX) / distanceSquared; // Inverse square force
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Apply force as acceleration (bounce away from cursor)
        particle.velocity.x += normalizedDx * force;
        particle.velocity.y += normalizedDy * force;
      }
    }
  }

  private applyResetterFields(): void {
    // Early exit if no resetter fields
    if (this.resetterFields.length === 0) return;
    
    const tsParticlesInstance = (window as any).tsParticles;
    if (!tsParticlesInstance) return;

    const container = tsParticlesInstance.domItem(0);
    if (!container) return;

    const canvas = container.canvas?.element;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;

    const particles = container.particles?.array || 
                     container.particles?._array || 
                     container._particles?.array ||
                     [];

    if (particles.length === 0) return;

    // Pre-calculate field positions in canvas coordinates for performance
    const fieldCanvasPositions = this.resetterFields.map(field => ({
      x: (field.x - canvasRect.left - window.scrollX) * scaleX,
      y: (field.y - canvasRect.top - window.scrollY) * scaleY,
      radiusSquared: (field.radius * scaleX) * (field.radius * scaleX)
    }));

    // Check each particle against resetter fields
    for (const particle of particles) {
      if (!particle.position || !particle.velocity) continue;
      
      // Check if particle is in any resetter field
      for (const fieldPos of fieldCanvasPositions) {
        const dx = fieldPos.x - particle.position.x;
        const dy = fieldPos.y - particle.position.y;
        const distanceSquared = dx * dx + dy * dy;
        
        if (distanceSquared < fieldPos.radiusSquared) {
          // Reset velocity to diagonal bottom-right
          particle.velocity.x = PARTICLE_DIAGONAL_VX;
          particle.velocity.y = PARTICLE_DIAGONAL_VY;
          break; // Only reset once per particle per frame
        }
      }
    }
  }

  private applyGravityToTsParticles(): void {
    // Early exit if no planets
    if (this.planets.length === 0) return;
    
    const tsParticlesInstance = (window as any).tsParticles;
    if (!tsParticlesInstance) return;

    const container = tsParticlesInstance.domItem(0);
    if (!container) return;

    // Cache particle array access
    const particles = container.particles?.array || 
                    container.particles?._array || 
                    container._particles?.array ||
                    [];

    if (particles.length === 0) return;

    // Get canvas element to convert coordinates
    const canvas = container.canvas?.element;
    if (!canvas) {
      console.log('No canvas element found');
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate scale factor (for retina displays)
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;

    for (const planet of this.planets) {
      // Convert planet page coordinates to canvas coordinates and apply scale
      const planetCanvasX = (planet.x - canvasRect.left - window.scrollX) * scaleX;
      const planetCanvasY = (planet.y - canvasRect.top - window.scrollY) * scaleY;

      const planetRadiusSquared = (planet.radius * scaleX) * (planet.radius * scaleX);
      const hitRadiusSquared = PLANET_HIT_RADIUS * PLANET_HIT_RADIUS;
      const offscreenBuffer = CANVAS_OFFSCREEN_BUFFER;
      
      for (const particle of particles) {
        if (!particle.position || !particle.velocity) continue;

        const dx = planetCanvasX - particle.position.x;
        const dy = planetCanvasY - particle.position.y;
        const distanceSquared = dx * dx + dy * dy;

        // Remove particle if it hits the planet center (within 40px) or goes off-screen
        const isOffScreen = particle.position.x < -offscreenBuffer || particle.position.y < -offscreenBuffer || 
                           particle.position.x > canvas.width + offscreenBuffer || particle.position.y > canvas.height + offscreenBuffer;
        
        if (distanceSquared < hitRadiusSquared || isOffScreen) {
          // Create pop effect if particle hit planet (not if just off-screen)
          if (distanceSquared < hitRadiusSquared) {
            // Convert particle canvas position back to page coordinates
            const particlePageX = (particle.position.x / scaleX) + canvasRect.left + window.scrollX;
            const particlePageY = (particle.position.y / scaleY) + canvasRect.top + window.scrollY;
            this.createPopEffect(particlePageX, particlePageY);
          }
          
          // Mark particle as destroyed by setting opacity to 0 and stopping it
          particle.opacity = 0;
          particle.velocity.x = 0;
          particle.velocity.y = 0;
          particle.position.x = -10000;
          particle.position.y = -10000;
          
          // Try multiple destroy methods
          if (typeof particle.destroy === 'function') {
            try {
              particle.destroy();
            } catch (e) {
              console.log('Destroy failed:', e);
            }
          }
          continue;
        }
        
        if (distanceSquared > 0 && distanceSquared < planetRadiusSquared) {
          const distance = Math.sqrt(distanceSquared);
          const force = (GRAVITY_STRENGTH * GRAVITY_MASS * 0.4) / distanceSquared;
          const ax = (dx / distance) * force;
          const ay = (dy / distance) * force;

          particle.velocity.x += ax;
          particle.velocity.y += ay;

          // Check if particle is moving away from planet
          const velocityTowardsPlanet = 
            (particle.velocity.x * dx + particle.velocity.y * dy) / distance;
          
          // If moving away from planet, apply damping to simulate energy loss
          if (velocityTowardsPlanet < 0) {
            particle.velocity.x *= 0.99;
            particle.velocity.y *= 0.99;
          }

          // Calculate current speed
          const currentSpeed = Math.sqrt(
            particle.velocity.x * particle.velocity.x + 
            particle.velocity.y * particle.velocity.y
          );

          // Cap speed at maximum to prevent particles from flying off too fast
          if (currentSpeed > PARTICLE_MAX_SPEED) {
            const scale = PARTICLE_MAX_SPEED / currentSpeed;
            particle.velocity.x *= scale;
            particle.velocity.y *= scale;
          }
        }
      }
    }
  }

  private createGlitterTrail(): void {
    const tsParticlesInstance = (window as any).tsParticles;
    if (!tsParticlesInstance) return;

    const container = tsParticlesInstance.domItem(0);
    if (!container) return;

    const canvas = container.canvas?.element;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;

    const particles = container.particles?.array || 
                    container.particles?._array || 
                    container._particles?.array ||
                    [];

    if (particles.length === 0) return;

    // Early exit if no sparkle zones and low chance
    const hasSparkleZones = this.sparkleZones.length > 0;
    
    // Pre-calculate zone positions in canvas coordinates for performance
    const zoneCanvasPositions = this.sparkleZones.map(zone => ({
      x: (zone.x - canvasRect.left - window.scrollX) * scaleX,
      y: (zone.y - canvasRect.top - window.scrollY) * scaleY,
      radiusSquared: (zone.radius * scaleX) * (zone.radius * scaleX)
    }));
    
    // Randomly spawn glitter from particles
    for (const particle of particles) {
      if (!particle.position || !particle.velocity) continue;
      
      // Check spawn chance early to avoid unnecessary calculations
      const randomValue = Math.random();
      
      // Quick check: if random value is above sparkle zone rate, skip zone checking
      if (!hasSparkleZones && randomValue >= GLITTER_SPAWN_CHANCE) continue;
      
      // Check if particle is in any sparkle zone (only if zones exist and worth checking)
      let inSparkleZone = false;
      if (hasSparkleZones && randomValue < 0.5) {
        // Use canvas coordinates directly (no conversion needed)
        for (const zonePos of zoneCanvasPositions) {
          const dx = zonePos.x - particle.position.x;
          const dy = zonePos.y - particle.position.y;
          const distanceSquared = dx * dx + dy * dy;
          
          if (distanceSquared < zonePos.radiusSquared) {
            inSparkleZone = true;
            break;
          }
        }
      }
      
      // Higher spawn chance in sparkle zones
      const spawnChance = inSparkleZone ? SPARKLE_ZONE_SPAWN_MULTIPLIER : GLITTER_SPAWN_CHANCE;
      
      if (randomValue < spawnChance) {
        // Convert canvas coordinates to page coordinates only when spawning
        const pageX = (particle.position.x / scaleX) + canvasRect.left + window.scrollX;
        const pageY = (particle.position.y / scaleY) + canvasRect.top + window.scrollY;
        // Get particle size (default to 5 if not available)
        const particleSize = particle.size?.value || particle.size || 5;
        
        // Get particle velocity for ejection direction
        const velocityX = particle.velocity.x;
        const velocityY = particle.velocity.y;
        
        // Use rainbow colors in sparkle zones
        this.spawnGlitter(pageX, pageY, particleSize, velocityX, velocityY, inSparkleZone);
      }
    }
  }

  private spawnGlitter(x: number, y: number, particleSize: number, velocityX: number, velocityY: number, isRainbow: boolean = false): void {
    const glitter = document.createElement('div');
    glitter.className = 'glitter-particle';
    glitter.style.left = `${x}px`;
    glitter.style.top = `${y}px`;
    
    // Scale glitter size based on particle size (0.6x to 1.2x of particle size)
    const glitterSize = particleSize/GLITTER_SIZE_FACTOR * (GLITTER_SIZE_MIN + Math.random() * GLITTER_SIZE_MAX);
    glitter.style.width = `${glitterSize}px`;
    glitter.style.height = `${glitterSize}px`;
    
    // Calculate backward direction (opposite of velocity)
    const angle = Math.atan2(velocityY, velocityX);
    const backwardAngle = angle + Math.PI; // 180 degrees opposite
    
    // Add random spread within ±20 degrees
    const spreadAngle = backwardAngle + (Math.random() - 0.5) * (GLITTER_SPREAD_ANGLE * Math.PI / 180);
    
    // Calculate particle speed
    const particleSpeed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    
    // Calculate ejection speed relative to particle speed (30-60% of particle speed)
    const ejectionSpeed = particleSpeed * (GLITTER_SPEED_MIN + Math.random() * GLITTER_SPEED_MAX);
    const ejectionVX = Math.cos(spreadAngle) * ejectionSpeed;
    const ejectionVY = Math.sin(spreadAngle) * ejectionSpeed;
    
    // Calculate spin speed based on ejection speed (faster = more spin)
    const spinSpeed = ejectionSpeed * GLITTER_SPIN_MULTIPLIER;
    
    // Random initial rotation
    const initialRotation = Math.random() * 360;
    glitter.style.transform = `translate(-50%, -50%) rotate(${initialRotation}deg)`;
    
    // Choose color - rainbow or custom gold
    let color: string;
    if (isRainbow) {
      color = GLITTER_COLORS_RAINBOW[Math.floor(Math.random() * GLITTER_COLORS_RAINBOW.length)];
      glitter.style.background = color;
    } else {
      color = this.glitterColor;
      glitter.style.background = color;
    }
    
    // Scale glow effect based on size
    const glowIntensity = glitterSize * 2;
    glitter.style.boxShadow = `0 0 ${glowIntensity}px ${color}, 0 0 ${glowIntensity * 2}px ${color}, 0 0 ${glowIntensity * 3}px ${color}`;
    
    this.glitterContainer.appendChild(glitter);

    // Animate the star
    let currentX = x;
    let currentY = y;
    let currentRotation = initialRotation;
    const startTime = Date.now();
    const duration = GLITTER_DURATION;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        glitter.remove();
        return;
      }
      
      // Calculate progress (0 to 1)
      const progress = elapsed / duration;
      
      // Update position
      currentX += ejectionVX;
      currentY += ejectionVY;
      glitter.style.left = `${currentX}px`;
      glitter.style.top = `${currentY}px`;
      
      // Update rotation
      currentRotation += spinSpeed / 60; // Assuming ~60fps
      glitter.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg) scale(${1 - progress * 0.8})`;
      
      // Update opacity (fade out)
      glitter.style.opacity = `${1 - progress}`;
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  public createPopEffect(x: number, y: number): void {
    const pop = document.createElement('div');
    pop.className = 'particle-pop';
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    pop.style.width = `${POP_SIZE}px`;
    pop.style.height = `${POP_SIZE}px`;
    document.body.appendChild(pop);

    // Remove the pop element after animation completes
    setTimeout(() => {
      pop.remove();
    }, POP_DURATION);
  }


  public destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    for (const planet of this.planets) {
      planet.element.remove();
    }

    this.planets = [];
  }
}
