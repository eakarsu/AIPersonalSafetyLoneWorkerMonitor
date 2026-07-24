import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });

export async function queryAI(systemPrompt, userMessage) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL;
    const baseUrl = process.env.OPENROUTER_BASE_URL;
    if (!apiKey || !model || !baseUrl) throw new Error('OpenRouter key, model, and base URL are required');
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Lone Worker Safety Monitor',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      throw new Error('No response content from OpenRouter');
    }

    return aiMessage;
  } catch (error) {
    console.error('OpenRouter service error:', error.message);
    throw error;
  }
}

export default queryAI;
