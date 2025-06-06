
import { ChartType } from './chart-card';

export interface VisualizationConfig {
  type: ChartType;
  title: string;
  description?: string;
  dataKey?: string;
  xAxisKey?: string;
  valueKey?: string;
  nameKey?: string;
  colors?: string[];
}

export class VisualizationService {
  static determineChartType(data: any[]): ChartType {
    if (!data || data.length === 0) return 'table';
    
    // Check if data is time series
    const firstRow = data[0];
    const hasTimeField = Object.keys(firstRow).some(key => 
      firstRow[key] instanceof Date || 
      (typeof firstRow[key] === 'string' && !isNaN(Date.parse(firstRow[key])))
    );
    
    if (hasTimeField) return 'line';
    
    // Check if data is categorical
    const numericFields = Object.keys(firstRow).filter(key => 
      typeof firstRow[key] === 'number'
    );
    
    if (numericFields.length === 1 && data.length <= 10) return 'pie';
    if (numericFields.length >= 1) return 'bar';
    
    return 'table';
  }

  static generateConfig(data: any[], title: string): VisualizationConfig {
    const type = this.determineChartType(data);
    const firstRow = data[0];
    
    const config: VisualizationConfig = {
      type,
      title,
      description: `${data.length} rows of data`,
    };

    if (type === 'pie') {
      const numericKey = Object.keys(firstRow).find(key => 
        typeof firstRow[key] === 'number'
      );
      const labelKey = Object.keys(firstRow).find(key => key !== numericKey);
      
      config.valueKey = numericKey;
      config.nameKey = labelKey;
    } else if (type === 'line' || type === 'bar') {
      const timeKey = Object.keys(firstRow).find(key =>
        firstRow[key] instanceof Date || 
        (typeof firstRow[key] === 'string' && !isNaN(Date.parse(firstRow[key])))
      );
      
      config.xAxisKey = timeKey || Object.keys(firstRow)[0];
      config.dataKey = Object.keys(firstRow).find(key => 
        typeof firstRow[key] === 'number'
      );
    }

    return config;
  }
}
export interface DataTransformConfig {
  aggregation?: 'sum' | 'average' | 'count' | 'min' | 'max';
  groupBy?: string;
  sortBy?: string;
  limit?: number;
}

export class DataTransformUtils {
  static transform(data: any[], config: DataTransformConfig) {
    let transformed = [...data];
    
    if (config.groupBy) {
      transformed = this.groupData(transformed, config.groupBy, config.aggregation || 'sum');
    }
    
    if (config.sortBy) {
      transformed.sort((a, b) => b[config.sortBy!] - a[config.sortBy!]);
    }
    
    if (config.limit) {
      transformed = transformed.slice(0, config.limit);
    }
    
    return transformed;
  }

  private static groupData(data: any[], groupBy: string, aggregation: string) {
    const grouped = data.reduce((acc, item) => {
      const key = item[groupBy];
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return Object.entries(grouped).map(([key, values]: [string, any[]]) => ({
      [groupBy]: key,
      value: this.aggregate(values, aggregation),
    }));
  }

  private static aggregate(data: any[], type: string): number {
    const values = data.map(item => Number(item.value));
    switch (type) {
      case 'sum': return values.reduce((a, b) => a + b, 0);
      case 'average': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min': return Math.min(...values);
      case 'max': return Math.max(...values);
      case 'count': return values.length;
      default: return values.reduce((a, b) => a + b, 0);
    }
  }
}
