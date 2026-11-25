/**
 * Tokat Taşhan (Voyvoda Han, 1631) — Architectural Metric Constants (meters).
 * All values correspond directly to ARCHITECTURE_SPEC.md.
 * Coordinate system: Y-up, (0, 0, 0) = center of courtyard stone floor.
 * X: East (+X) / West (-X), Z: South (+Z) / North (-Z).
 */

export const TASHAN = {
  // Modular bay counts & center-to-center spacing
  BAYS_Z: 11, // Long wings (West & East): 11 bays -> bay index 5 is at Z = 0
  BAYS_X: 6,  // Short wings (North & South): 6 bays
  BAY_SPAN_Z: 4.85, // 0.90 m pier + 3.95 m clear opening
  BAY_SPAN_X: 4.70, // 0.90 m pier + 3.80 m clear opening

  // Pier line spans (corner pier center to corner pier center)
  COURTYARD_PIER_Z: 11 * 4.85, // 53.35 m (Z = -26.675 .. +26.675)
  COURTYARD_PIER_X: 6 * 4.70,  // 28.20 m (X = -14.10  .. +14.10)
  HALF_PIER_Z: (11 * 4.85) / 2, // 26.675 m
  HALF_PIER_X: (6 * 4.70) / 2,  // 14.10 m

  // Overall outer dimensions (80.80 m x 52.60 m)
  OUTER_Z: 80.80,
  OUTER_X: 52.60,
  HALF_OUTER_Z: 40.40,
  HALF_OUTER_X: 26.30,

  // Wing & Arcade depths
  REVAK_DEPTH: 3.60,     // Pier centerline to shop wall front face
  SHOP_WALL_THICK: 0.65, // Inner courtyard shop facade wall thickness
  OUTER_WALL_THICK: 0.90,

  // Derived shop facade planes (front face facing courtyard)
  WALL_WEST_X: -14.10 - 3.60,   // -17.70 m
  WALL_EAST_X: 14.10 + 3.60,    // +17.70 m
  WALL_NORTH_Z: -26.675 - 3.60, // -30.275 m
  WALL_SOUTH_Z: 26.675 + 3.60,  // +30.275 m

  // Vertical elevations (meters above courtyard datum Y = 0)
  STREET_Y: -0.18,
  COURTYARD_Y: 0.00,
  REVAK_Y: 0.12,

  // Ground floor pier & arch metrics
  GROUND_PIER_W: 0.90,
  GROUND_BASE_H: 0.40,     // +0.12 -> +0.52
  GROUND_SHAFT_H: 1.93,    // +0.52 -> +2.45
  GROUND_CAP_H: 0.30,      // +2.45 -> +2.75
  GROUND_SPRING_Y: 2.75,
  GROUND_ARCH_RISE: 1.80,  // +2.75 -> +4.55 apex
  GROUND_VAULT_CROWN: 4.75,
  UPPER_FLOOR_Y: 5.10,     // 2nd story floor surface

  // Upper floor pier, balustrade & arch metrics
  RAIL_HEIGHT: 1.02,       // +5.10 -> +6.12
  UPPER_PIER_W: 0.80,
  UPPER_BASE_H: 0.32,      // +5.10 -> +5.42
  UPPER_SHAFT_H: 1.68,     // +5.42 -> +7.10
  UPPER_CAP_H: 0.26,       // +7.10 -> +7.36
  UPPER_SPRING_Y: 7.36,
  UPPER_ARCH_RISE: 1.69,   // +7.36 -> +9.05 apex
  UPPER_VAULT_CROWN: 9.28,
  EAVE_Y: 9.65,            // Roof eave & cornice level

  // Roof metrics
  ROOF_PITCH_DEG: 26,
  ROOF_OVERHANG: 0.85,
  RIDGE_Y: 12.85,

  // East Entrance Portal (Taçkapı) & Mescit
  PORTAL_PROJ_X: 1.65,     // Projects out from X = +26.30 to +27.95
  PORTAL_WIDTH: 7.40,
  PORTAL_HEIGHT: 9.55,
  CORRIDOR_WIDTH: 3.95,    // Matches center bay clear arch
  CORRIDOR_HEIGHT: 4.55,

  // Symmetric Stone Stairs (East interior, flanking Z=0 entrance bay)
  STAIR_COUNT: 30,
  STAIR_RISER: (5.10 - 0.12) / 30, // 0.166 m
  STAIR_TREAD: 0.30,               // 30 * 0.30 = 9.00 m run
  STAIR_WIDTH: 1.85,
  STAIR_START_Z: 3.20,             // ±3.20 m -> ±12.20 m
  STAIR_END_Z: 12.20,
  STAIR_INNER_X: 15.85,            // Stair occupies X = +15.85 .. +17.70

  // Player ergonomics
  EYE_HEIGHT: 1.70,
  PLAYER_RADIUS: 0.36,
};

export function pierZ(i) {
  return -TASHAN.HALF_PIER_Z + i * TASHAN.BAY_SPAN_Z;
}

export function pierX(j) {
  return -TASHAN.HALF_PIER_X + j * TASHAN.BAY_SPAN_X;
}
