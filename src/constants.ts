// Cursor and interaction
export const REPULSE_RADIUS = 50;

// Planet properties
export const PLANET_RADIUS = 80;
export const PLANET_PARTICLES = 30;
export const PLANET_CORE_SIZE = 20;
export const PLANET_HIT_RADIUS = 40;

// Gravity physics
export const GRAVITY_STRENGTH = 2;
export const GRAVITY_MASS = 500;
export const GRAVITY_ACCELERATION = 0.1;
export const ORBITAL_DAMPING = 0.9999;
export const ORBITAL_RADIUS_FACTOR = 0.9;

// Particle properties
export const PARTICLE_BASE_SPEED = 6;
export const PARTICLE_MAX_SPEED = 15;
export const PARTICLE_FRICTION = 0.98;
export const PARTICLE_DIAGONAL_VX = 0.7071067811865476;
export const PARTICLE_DIAGONAL_VY = 0.7071067811865475;

// Generator properties
export const GENERATOR_EMIT_INTERVAL = 1000; // ms
export const GENERATOR_PARTICLE_SPEED = 1;
export const GENERATOR_TRANSITION_DURATION = 2000; // ms

// Glitter properties
export const GLITTER_SPAWN_CHANCE = 0.2; // 
export const GLITTER_SIZE_MIN = 0.7;
export const GLITTER_SIZE_MAX = 1;
export const GLITTER_SIZE_FACTOR = .8;
export const GLITTER_SPEED_MIN = 0.3;
export const GLITTER_SPEED_MAX = 0.6;
export const GLITTER_SPREAD_ANGLE = 45; // degrees
export const GLITTER_SPIN_MULTIPLIER = 100;
export const GLITTER_DURATION = 800; // ms

// Collision and removal
export const OFFSCREEN_BUFFER = 100;
export const CANVAS_OFFSCREEN_BUFFER = 50;

// Item limits
export const MAX_PLANETS = 3;
export const MAX_GENERATORS = 3;
export const MAX_SPARKLE_ZONES = 2;
export const MAX_RESETTER_FIELDS = 2;
export const MAX_PARTICLES = 40;

// Animation and timing
export const PHYSICS_FRAME_SKIP = 2; // Run physics every N frames
export const FADE_OUT_DURATION = 500; // ms
export const RESET_ANIMATION_DURATION = 1000; // ms
export const PARTICLE_FADE_IN_DURATION = 2000; // ms

// Planet sizing
export const PLANET_SIZE_MIN = 50;
export const PLANET_SIZE_MAX = 200;
export const PLANET_SIZE_DEFAULT = 80;
export const PLANET_SIZE_STEP = 10;

// Sparkle zone sizing
export const SPARKLE_ZONE_SIZE_MIN = 50;
export const SPARKLE_ZONE_SIZE_MAX = 200;
export const SPARKLE_ZONE_SIZE_DEFAULT = 100;
export const SPARKLE_ZONE_SIZE_STEP = 10;

// Resetter field sizing
export const RESETTER_FIELD_SIZE_MIN = 50;
export const RESETTER_FIELD_SIZE_MAX = 200;
export const RESETTER_FIELD_SIZE_DEFAULT = 100;
export const RESETTER_FIELD_SIZE_STEP = 10;

// Particle burst
export const BURST_PARTICLE_COUNT = 2;
export const BURST_SPEED_MIN = 2;
export const BURST_SPEED_MAX = 4;

// Mouse velocity
export const MOUSE_VELOCITY_TRANSFER = 0.5;
export const MOUSE_VELOCITY_TRANSFER_TS = 0.3;

// Sparkle zone spawn rate
export const SPARKLE_ZONE_SPAWN_MULTIPLIER = 0.9; // 90% spawn rate in zones

// Pop effect
export const POP_DURATION = 400; // ms
export const POP_SIZE = 40; // px

// tsParticles config
export const TS_FPS_LIMIT = 120;
export const TS_PARTICLE_SIZE_MIN = 3;
export const TS_PARTICLE_SIZE_MAX = 8;
export const TS_PARTICLE_SPEED = 6;
export const TS_PARTICLE_TRAIL_LENGTH = 5;
export const TS_PARTICLE_ROTATION_SPEED = 10;
export const TS_EMITTER_RATE_DELAY = 0.1;
export const TS_EMITTER_RATE_QUANTITY = 1;

// Colors
export const STAR_COLOR = '#f5f5f0'; // Soothing off-white star particles
export const GLITTER_COLOR_GOLD = '#FFD700'; // Gold glitter (default)
export const GLITTER_COLORS_RAINBOW = [
  '#FF0000', // Red
  '#FF7F00', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#0000FF', // Blue
  '#4B0082', // Indigo
  '#9400D3'  // Violet
];
