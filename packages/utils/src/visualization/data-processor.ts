import type { VisualizationData, PlotDataPoint } from '../types.js';
import * as d3 from 'd3';

export class DataProcessor {
    static processVisualizationData(
      data: VisualizationData,
      projectionIndex: number,
      isolationMode: boolean = false,
      splitHistory?: string[][]
    ): PlotDataPoint[] {
      if (!data.projections[projectionIndex]) return [];
  
      const processedData: PlotDataPoint[] = data.protein_ids.map((id, index) => {
        const coordinates = data.projections[projectionIndex].data[index] as [number, number];
        
        // Map feature values for this protein
        const featureValues: Record<string, string | null> = {};
        Object.keys(data.features).forEach((featureKey) => {
          const featureIndex = data.feature_data[featureKey][index];
          featureValues[featureKey] = 
            featureIndex !== undefined &&
            featureIndex !== null &&
            Array.isArray(data.features[featureKey].values) &&
            featureIndex >= 0 &&
            featureIndex < data.features[featureKey].values.length
              ? data.features[featureKey].values[featureIndex] || null
              : null;
        });
  
        return {
          id,
          x: coordinates[0],
          y: coordinates[1],
          featureValues,
          originalIndex: index,
        };
      });
  
      // Apply isolation filtering if needed
      if (isolationMode && splitHistory && splitHistory.length > 0) {
        let filteredData = processedData.filter(p => splitHistory[0].includes(p.id));
        
        for (let i = 1; i < splitHistory.length; i++) {
          const splitIds = splitHistory[i];
          filteredData = filteredData.filter(p => splitIds.includes(p.id));
        }
        
        return filteredData;
      }
  
      return processedData;
    }
  
    static createScales(
      plotData: PlotDataPoint[],
      width: number,
      height: number,
      margin: { top: number; right: number; bottom: number; left: number }
    ) {
      if (plotData.length === 0) return null;
  
      const xExtent = d3.extent(plotData, d => d.x) as [number, number];
      const yExtent = d3.extent(plotData, d => d.y) as [number, number];
  
      const xPadding = Math.abs(xExtent[1] - xExtent[0]) * 0.05;
      const yPadding = Math.abs(yExtent[1] - yExtent[0]) * 0.05;
  
      return {
        x: d3.scaleLinear()
          .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
          .range([margin.left, width - margin.right]),
        y: d3.scaleLinear()
          .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
          .range([height - margin.bottom, margin.top]),
      };
    }
  }
  