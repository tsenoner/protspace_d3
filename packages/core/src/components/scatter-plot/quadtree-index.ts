import * as d3 from 'd3';
import type { PlotDataPoint } from '@protspace/utils';

export class QuadtreeIndex {
  private qt: d3.Quadtree<PlotDataPoint> | null = null;
  private scales: {
    x: d3.ScaleLinear<number, number>;
    y: d3.ScaleLinear<number, number>;
  } | null = null;

  setScales(
    scales: {
      x: d3.ScaleLinear<number, number>;
      y: d3.ScaleLinear<number, number>;
    } | null
  ) {
    this.scales = scales;
  }

  rebuild(plotData: PlotDataPoint[]) {
    if (!this.scales || plotData.length === 0) {
      this.qt = null;
      return;
    }
    this.qt = d3
      .quadtree<PlotDataPoint>()
      .x((d) => this.scales!.x(d.x))
      .y((d) => this.scales!.y(d.y))
      .addAll(plotData);
  }

  findNearest(screenX: number, screenY: number, radius: number): PlotDataPoint | undefined {
    if (!this.qt) return undefined;
    return this.qt.find(screenX, screenY, radius) || undefined;
  }

  /**
   * Collect all points within a screen-space rectangle using quadtree traversal.
   * The rectangle is specified in the same coordinate system used to build the quadtree
   * (in this component we index screen coordinates via scales.x/.y).
   */
  queryRectangle(x0: number, y0: number, x1: number, y1: number): PlotDataPoint[] {
    const results: PlotDataPoint[] = [];
    if (!this.qt) return results;
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    this.qt.visit((node, nx0, ny0, nx1, ny1) => {
      if (nx1 < minX || nx0 > maxX || ny1 < minY || ny0 > maxY) return true;
      const d = (node as any).data as PlotDataPoint | undefined;
      if (d) {
        const sx = this.scales!.x(d.x);
        const sy = this.scales!.y(d.y);
        if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
          results.push(d);
        }
      }
      return false;
    });
    return results;
  }
}
