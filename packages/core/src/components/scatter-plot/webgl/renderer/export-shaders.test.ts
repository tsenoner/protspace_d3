import { describe, expect, it } from 'vitest';
import { POINT_FRAGMENT_SHADER, POINT_VERTEX_SHADER } from './export-shaders';

describe('point shaders', () => {
  it('passes the transferred-annotation flag through as a flat varying', () => {
    expect(POINT_VERTEX_SHADER).toContain('in float a_predicted;');
    expect(POINT_VERTEX_SHADER).toContain('flat out float v_predicted;');
    expect(POINT_VERTEX_SHADER).toContain('v_predicted = a_predicted;');
    expect(POINT_FRAGMENT_SHADER).toContain('flat in float v_predicted;');
  });

  it('cuts out glyph interiors only for transferred annotations', () => {
    expect(POINT_FRAGMENT_SHADER).toContain('if (v_predicted > 0.5)');
    expect(POINT_FRAGMENT_SHADER).toContain(
      'predictedInterior = smoothstep(ringWidth, ringWidth + interiorAa, edgeDist);',
    );
    expect(POINT_FRAGMENT_SHADER).toContain(
      'mix(finalColor * v_color.a, linearKnockoutColor * PREDICTED_INTERIOR_FILL, predictedInterior)',
    );
    expect(POINT_FRAGMENT_SHADER).toContain('uniform vec3 u_knockoutColor;');
    // The interior cut-out is the ONLY thing still gated on the predicted flag. This used to
    // also assert `v_predicted < 0.5`, which pinned the outline being skipped on rings — the
    // exact behaviour #369 asked to reconcile. The outline now applies to both classes (see
    // the outline describe block), so the hollow interior is what distinguishes them.
    expect(POINT_FRAGMENT_SHADER).toContain('clamp(pixelScale * 1.75, 0.30, 0.55)');
    expect(POINT_FRAGMENT_SHADER).toContain('min(pixelScale, (1.0 - ringWidth) * 0.5)');
  });

  it('sizes the ring from an isotropic pixel scale so the hole stays round', () => {
    expect(POINT_FRAGMENT_SHADER).toContain(
      'float pixelScale = max(length(dFdx(coord)), length(dFdy(coord)));',
    );
    // fwidth() is the L1 norm of the partials, so on a radial distance field it reads ~41%
    // larger along the diagonals than along the axes. Any `aa` in the ring block makes the ring
    // width angle-dependent, which pinches the hole into a cross instead of a circle.
    const ringStart = POINT_FRAGMENT_SHADER.indexOf('if (v_predicted > 0.5)');
    const ringEnd = POINT_FRAGMENT_SHADER.indexOf('if (shapeAlpha < 0.001)');
    expect(ringStart).toBeGreaterThan(-1);
    expect(ringEnd).toBeGreaterThan(ringStart);
    expect(POINT_FRAGMENT_SHADER.slice(ringStart, ringEnd)).not.toMatch(/\baa\b/);
  });

  it('makes the predicted interior hollow via a single revertible flag', () => {
    expect(POINT_FRAGMENT_SHADER).toContain('const float PREDICTED_INTERIOR_FILL = 0.0;');
    expect(POINT_FRAGMENT_SHADER).toContain(
      'mix(v_color.a, PREDICTED_INTERIOR_FILL, predictedInterior)',
    );
  });

  describe('outline (#369)', () => {
    // The outline needs BOTH a fraction of the sprite radius and a device-pixel floor.
    //
    // A pure fraction goes sub-pixel on small sprites and at export scale. A pure
    // device-pixel width is worse in the other direction, and was shipped briefly: at
    // gl_PointSize 240 a 1px rim on a 120px radius is invisible, so filled dots lost
    // their border entirely while exploring. max() of the two gives a rim that scales
    // with the glyph on screen and still survives in print.
    it('sizes the outline from both a radius fraction and a device-pixel floor', () => {
      expect(POINT_FRAGMENT_SHADER).toContain('OUTLINE_RADIUS_FRACTION');
      expect(POINT_FRAGMENT_SHADER).toContain('OUTLINE_DEVICE_PX');
      expect(POINT_FRAGMENT_SHADER).toContain(
        'max(OUTLINE_RADIUS_FRACTION, OUTLINE_DEVICE_PX * pixelScale)',
      );
      // The old hard-coded band must be gone; the fraction is a named constant now.
      expect(POINT_FRAGMENT_SHADER).not.toContain('float strokeWidth = 0.15;');
    });

    it('derives the outline width from the same isotropic pixel scale as the ring', () => {
      // pixelScale is hoisted so both the ring and the outline share one definition; deriving
      // the outline from fwidth() instead would make it ~41% wider on the diagonals.
      const shader = POINT_FRAGMENT_SHADER;
      const scaleDecl = shader.indexOf(
        'float pixelScale = max(length(dFdx(coord)), length(dFdy(coord)));',
      );
      const ringBlock = shader.indexOf('if (v_predicted > 0.5)');
      expect(scaleDecl).toBeGreaterThan(-1);
      expect(scaleDecl).toBeLessThan(ringBlock);
      expect(shader).toContain('OUTLINE_DEVICE_PX * pixelScale');
    });

    it('outlines predicted rings as well as filled dots', () => {
      // The literal "reconcile" of #369: both glyph classes get the same outline treatment,
      // and each keeps its own identity (filled vs hollow) as the primary encoding.
      expect(POINT_FRAGMENT_SHADER).not.toContain('v_predicted < 0.5 && v_color.a > 0.5');
    });

    it('budget-caps the outline against ring width so it cannot eat the annulus', () => {
      // An unclamped outer darken consumes 27-50% of the ring at every size, and specifically
      // the outer part, where shapeAlpha is already fading it out.
      expect(POINT_FRAGMENT_SHADER).toContain('OUTLINE_RING_BUDGET');
    });

    it('anti-aliases the outline inner edge', () => {
      // The old inner edge was a hard `if` threshold on a field whose outer edge is smoothed.
      expect(POINT_FRAGMENT_SHADER).toMatch(/smoothstep\([^)]*outline/i);
    });

    it('keeps the ring width free of any angle-dependent term', () => {
      const ringStart = POINT_FRAGMENT_SHADER.indexOf('if (v_predicted > 0.5)');
      const ringEnd = POINT_FRAGMENT_SHADER.indexOf('if (shapeAlpha < 0.001)');
      expect(POINT_FRAGMENT_SHADER.slice(ringStart, ringEnd)).not.toMatch(/\baa\b/);
    });
  });
});
