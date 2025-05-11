
export interface NLQRequest {
  question: string;
  schema: any;
  dataSourceType: string;
}

export interface NLQResponse {
  sql: string;
  explanation: string;
  confidence: number;
}

export class NLQService {
  static async generateQuery(request: NLQRequest): Promise<NLQResponse> {
    try {
      const response = await fetch('/api/nlq/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate query');
      }
      
      return await response.json();
    } catch (error) {
      console.error('NLQ generation failed:', error);
      throw error;
    }
  }

  static async validateQuery(sql: string): Promise<boolean> {
    try {
      const response = await fetch('/api/nlq/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Query validation failed:', error);
      return false;
    }
  }
}
