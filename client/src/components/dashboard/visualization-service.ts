
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
