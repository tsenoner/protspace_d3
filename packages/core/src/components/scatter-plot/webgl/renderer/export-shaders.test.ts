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
    // The hollow interior is the only thing that distinguishes the two glyph classes; the
    // outline applies to both (#369, see the outline describe block).
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
    it('sizes the outline from a radius fraction, a device-pixel floor, and a budget', () => {
      // The outline needs a FRACTION of the sprite radius so the rim grows with the glyph (a
      // pure device-pixel width was shipped briefly: at gl_PointSize 240 a 1px rim on a 120px
      // radius is invisible), and a device-pixel FLOOR so a pure fraction cannot go sub-pixel
      // on small sprites or in print. The budget then caps it per glyph class.
      expect(POINT_FRAGMENT_SHADER).toContain(
        'min(max(OUTLINE_RADIUS_FRACTION, OUTLINE_DEVICE_PX * fieldPerPixel), outlineBudget)',
      );
    });

    it('converts device pixels through the edgeDist gradient, not the sprite pixel scale', () => {
      // pixelScale is pixels in SPRITE units; edgeDist is only a unit-gradient field for the
      // circle, square, triangles and plus. The diamond's `1 - (|x|*SQRT3 + |y|)` has |grad| = 2,
      // so `OUTLINE_DEVICE_PX * pixelScale` would put its "1 device pixel" floor at half a pixel
      // — under the reproducible-line floor #369 exists to clear. length() of the partials (NOT
      // fwidth, whose L1 norm reads ~41% larger on the diagonals) is the shape-correct
      // conversion, clamped to the [1, 2] x pixelScale gradient range every shape lives in.
      expect(POINT_FRAGMENT_SHADER).toContain(
        'length(vec2(dFdx(edgeDist), dFdy(edgeDist))), pixelScale, pixelScale * 2.0)',
      );
      expect(POINT_FRAGMENT_SHADER).toContain('float fieldPerPixel = clamp(');
      // ...and it must be hoisted above the ring block, like pixelScale, so both share one origin.
      const scaleDecl = POINT_FRAGMENT_SHADER.indexOf(
        'float pixelScale = max(length(dFdx(coord)), length(dFdy(coord)));',
      );
      const fieldDecl = POINT_FRAGMENT_SHADER.indexOf('float fieldPerPixel = clamp(');
      const ringBlock = POINT_FRAGMENT_SHADER.indexOf('if (v_predicted > 0.5)');
      expect(scaleDecl).toBeGreaterThan(-1);
      expect(ringBlock).toBeGreaterThan(fieldDecl);
      expect(fieldDecl).toBeGreaterThan(scaleDecl);
    });

    it('applies one outline treatment to both glyph classes', () => {
      // The literal "reconcile" of #369. The outline code must not branch on the predicted flag
      // at all — everything class-specific is carried by outlineBudget, resolved up in the ring
      // block — so filled-vs-hollow stays the only thing telling the two classes apart.
      const outlineStart = POINT_FRAGMENT_SHADER.indexOf('float outlineWidth =');
      const outlineEnd = POINT_FRAGMENT_SHADER.indexOf('// Predicted interiors mix toward');
      expect(outlineStart).toBeGreaterThan(-1);
      expect(outlineEnd).toBeGreaterThan(outlineStart);
      expect(POINT_FRAGMENT_SHADER.slice(outlineStart, outlineEnd)).not.toContain('v_predicted');
    });

    it('budget-caps the outline against ring width so it cannot eat the annulus', () => {
      // An unbudgeted outer darken consumes 27-50% of the ring at every size, and specifically
      // the outer part, where shapeAlpha is already fading it out. Assert the cap is applied,
      // not merely that the constant is declared.
      expect(POINT_FRAGMENT_SHADER).toContain('outlineBudget = ringWidth * OUTLINE_RING_BUDGET;');
    });

    it('budget-caps the outline on filled dots too, so a small sprite keeps its hue', () => {
      // The device-pixel floor is 2/gl_PointSize in field units, i.e. unbounded as the sprite
      // shrinks: at gl_PointSize 4 it is half the radius and at 2 it is the whole glyph, which
      // would render every dot in a dense/zoomed-out view up to 50% darker than the hue its
      // legend swatch shows. The dot budget is what keeps the interior on-palette.
      expect(POINT_FRAGMENT_SHADER).toContain('const float OUTLINE_DOT_BUDGET = 0.35;');
      expect(POINT_FRAGMENT_SHADER).toContain('float outlineBudget = OUTLINE_DOT_BUDGET;');
    });

    it('anti-aliases the outline inner edge', () => {
      // The old inner edge was a hard `if` threshold on a field whose outer edge is smoothed.
      expect(POINT_FRAGMENT_SHADER).toMatch(/smoothstep\([^)]*outline/i);
    });
  });
});
