import fetch from "node-fetch";

// Using OpenRouter instead of OpenAI directly
const OPENROUTER_API_KEY = "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";
const OPENROUTER_MODEL = "tngtech/deepseek-r1t-chimera:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Schema type definition for database schema
interface TableSchema {
  name: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    references?: {
      table: string;
      column: string;
    };
  }[];
}

export async function convertNaturalLanguageToSQL(
  question: string,
  schema: TableSchema[]
): Promise<string> {
  try {
    // Format schema for easier comprehension by the model
    const formattedSchema = schema.map(table => {
      const columnsFormatted = table.columns.map(column => {
        let columnInfo = `${column.name} (${column.type})`;
        if (column.isPrimaryKey) columnInfo += " PRIMARY KEY";
        if (column.isForeignKey && column.references) {
          columnInfo += ` REFERENCES ${column.references.table}(${column.references.column})`;
        }
        return columnInfo;
      }).join(", ");
      
      return `Table: ${table.name}\nColumns: ${columnsFormatted}`;
    }).join("\n\n");

    // Create prompt for the model
    const prompt = `
You are an expert SQL writer. Convert the following natural language question to a SQL query.

Database Schema:
${formattedSchema}

User Question: ${question}

Generate a valid SQL query that answers this question. 
Only return the SQL query without any explanation or markdown formatting.
`;

    // Call OpenRouter API
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://replit.com"
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // Lower temperature for more deterministic results
        max_tokens: 500
      })
    });

    const responseData = await response.json() as any;
    
    if (!response.ok) {
      throw new Error(`OpenRouter API returned an error: ${responseData.error?.message || response.statusText}`);
    }

    const sqlQuery = responseData.choices?.[0]?.message?.content?.trim();
    
    if (!sqlQuery) {
      throw new Error("Failed to generate SQL query");
    }

    return sqlQuery;
  } catch (error) {
    console.error("Error converting natural language to SQL:", error);
    throw new Error("Failed to convert natural language to SQL");
  }
}

export async function generateDataInsights(data: any): Promise<string[]> {
  try {
    // Format the data for the AI prompt
    const dataString = JSON.stringify(data, null, 2);
    
    const prompt = `
You are a data analyst expert. Analyze the following dataset and provide 3 meaningful insights.

Data:
${dataString}

For each insight:
1. Identify a pattern, trend, or anomaly in the data
2. Explain why it's significant
3. Suggest a potential action or deeper analysis

Format your response as a JSON object with a field named "insights" that contains an array of strings, each string containing one insight.
Example: { "insights": ["Insight 1 description", "Insight 2 description", "Insight 3 description"] }
`;

    // Call OpenRouter API
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://replit.com"
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const responseData = await response.json() as any;
    
    if (!response.ok) {
      throw new Error(`OpenRouter API returned an error: ${responseData.error?.message || response.statusText}`);
    }

    const insightsText = responseData.choices?.[0]?.message?.content;
    
    if (!insightsText) {
      return ["No insights could be generated from the provided data."];
    }

    try {
      const parsedResponse = JSON.parse(insightsText);
      const insights = parsedResponse.insights;
      return Array.isArray(insights) ? insights : [insightsText];
    } catch (e) {
      // If parsing fails, return the raw text as a single insight
      return [insightsText];
    }
  } catch (error) {
    console.error("Error generating data insights:", error);
    return ["Failed to generate insights. Please try again later."];
  }
}
