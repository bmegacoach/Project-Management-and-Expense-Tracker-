/**
 * Utility to list and check available Gemini models
 */

export interface GeminiModel {
  name: string
  displayName: string
  description: string
  inputTokenLimit: number
  outputTokenLimit: number
  supportedGenerationMethods: string[]
}

export async function listGeminiModels(apiKey: string): Promise<GeminiModel[]> {
  try {
    console.log('Fetching available Gemini models...')
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${response.statusText}`)
    }

    const data = await response.json()
    const models: GeminiModel[] = data.models || []

    console.log('Available Gemini Models:')
    models.forEach(model => {
      console.log(`
Name: ${model.name}
Display Name: ${model.displayName}
Input Token Limit: ${model.inputTokenLimit}
Output Token Limit: ${model.outputTokenLimit}
Supported Methods: ${model.supportedGenerationMethods.join(', ')}
---`)
    })

    return models
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching models:', errorMsg)
    throw error
  }
}

export function filterGenerativeModels(
  models: GeminiModel[]
): GeminiModel[] {
  return models.filter(model =>
    model.supportedGenerationMethods.includes('generateContent')
  )
}

export function getBestModel(models: GeminiModel[]): GeminiModel | null {
  const generativeModels = filterGenerativeModels(models)
  if (generativeModels.length === 0) return null

  // Prefer pro models, then fall back to others
  const proModel = generativeModels.find(m => m.name.includes('pro'))
  if (proModel) return proModel

  return generativeModels[0]
}

// For testing in browser console:
// Copy this to use in browser console:
// const apiKey = "YOUR_API_KEY_HERE";
// (async () => {
//   const { listGeminiModels } = await import('./utils/geminiModels.js');
//   await listGeminiModels(apiKey);
// })();
