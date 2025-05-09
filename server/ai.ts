import fetch from "node-fetch";

// Using OpenRouter instead of OpenAI directly
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = "tngtech/deepseek-r1t-chimera:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Validate that the API key is available
if (!OPENROUTER_API_KEY) {
  console.error("OPENROUTER_API_KEY is not set in environment variables");
}

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

    console.log("Sending NL-to-SQL request to OpenRouter.ai...");
    
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

    console.log(`OpenRouter response status: ${response.status}`);
    const responseData = await response.json() as any;
    
    // Log response structure (without the full content for brevity)
    console.log("OpenRouter response structure:", 
      JSON.stringify({
        ...responseData,
        choices: responseData.choices ? 
          responseData.choices.map((c: any) => ({ ...c, message: { ...c.message, content: "[Content truncated]" } })) : 
          undefined
      }, null, 2)
    );
    
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
    if (error instanceof Error) {
      throw new Error(`Failed to convert natural language to SQL: ${error.message}`);
    } else {
      throw new Error("Failed to convert natural language to SQL: Unknown error");
    }
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

    console.log("Sending data insights request to OpenRouter.ai...");
    
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

    console.log(`OpenRouter response status for insights: ${response.status}`);
    const responseData = await response.json() as any;
    
    // Log response structure (without the full content for brevity)
    console.log("OpenRouter insights response structure:", 
      JSON.stringify({
        ...responseData,
        choices: responseData.choices ? 
          responseData.choices.map((c: any) => ({ ...c, message: { ...c.message, content: "[Content truncated]" } })) : 
          undefined
      }, null, 2)
    );
    
    if (!response.ok) {
      throw new Error(`OpenRouter API returned an error: ${responseData.error?.message || response.statusText}`);
    }

    const insightsText = responseData.choices?.[0]?.message?.content;
    
    if (!insightsText) {
      return ["No insights could be generated from the provided data."];
    }

    try {
      const parsedResponse = JSON.parse(insightsText) as { insights: string[] };
      const insights = parsedResponse.insights;
      return Array.isArray(insights) ? insights : [insightsText];
    } catch (e) {
      // If parsing fails, return the raw text as a single insight
      console.log("Failed to parse AI response as JSON:", e);
      return [insightsText];
    }
  } catch (error) {
    console.error("Error generating data insights:", error);
    if (error instanceof Error) {
      return [`Failed to generate insights: ${error.message}`];
    } else {
      return ["Failed to generate insights. Please try again later."];
    }
  }
}
