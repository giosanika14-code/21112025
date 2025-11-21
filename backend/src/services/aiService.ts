import Anthropic from '@anthropic-ai/sdk';
import { AIAnalysisResult, AIResponse, DepartmentType } from '../types';
import { query } from '../config/database';

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface KnowledgeBaseEntry {
  category: string;
  title: string;
  content: string;
}

/**
 * AI Service for handling guest requests and task routing
 */
export class AIService {
  /**
   * Analyze guest message and determine department routing
   */
  static async analyzeGuestRequest(
    message: string,
    hotelId: string,
    language?: string
  ): Promise<AIAnalysisResult> {
    try {
      // Get hotel knowledge base
      const knowledgeBase = await this.getHotelKnowledgeBase(hotelId);

      const prompt = this.buildAnalysisPrompt(message, knowledgeBase, language);

      let response: string;

      if (LLM_PROVIDER === 'anthropic') {
        response = await this.callAnthropicAPI(prompt);
      } else {
        // OpenAI implementation can be added here
        throw new Error('OpenAI provider not yet implemented');
      }

      return this.parseAnalysisResponse(response);
    } catch (error) {
      console.error('Error analyzing guest request:', error);
      // Default fallback routing
      return {
        department_type: DepartmentType.CONCIERGE,
        priority: 'medium',
        title: 'Guest Request',
        summary: message.substring(0, 100),
        confidence: 0.5,
      };
    }
  }

  /**
   * Generate AI response to guest message
   */
  static async generateGuestResponse(
    message: string,
    hotelId: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    language?: string
  ): Promise<AIResponse> {
    try {
      const knowledgeBase = await this.getHotelKnowledgeBase(hotelId);

      const prompt = this.buildResponsePrompt(
        message,
        knowledgeBase,
        conversationHistory,
        language
      );

      let response: string;

      if (LLM_PROVIDER === 'anthropic') {
        response = await this.callAnthropicAPI(prompt, conversationHistory);
      } else {
        throw new Error('OpenAI provider not yet implemented');
      }

      return this.parseResponseWithTaskDetection(response, message, hotelId, language);
    } catch (error) {
      console.error('Error generating guest response:', error);
      return {
        message: 'I apologize, but I encountered an error. Please try again or contact the front desk.',
        language: language || 'en',
        requires_task: false,
      };
    }
  }

  /**
   * Call Anthropic Claude API
   */
  private static async callAnthropicAPI(
    prompt: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Add current prompt
    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: messages,
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }

  /**
   * Get hotel knowledge base
   */
  private static async getHotelKnowledgeBase(
    hotelId: string
  ): Promise<KnowledgeBaseEntry[]> {
    const result = await query(
      `SELECT category, title, content
       FROM knowledge_base
       WHERE hotel_id = $1 AND is_active = true
       ORDER BY category, title`,
      [hotelId]
    );

    return result.rows;
  }

  /**
   * Build prompt for analyzing guest request
   */
  private static buildAnalysisPrompt(
    message: string,
    knowledgeBase: KnowledgeBaseEntry[],
    language?: string
  ): string {
    const kbContext = knowledgeBase.length > 0
      ? `\n\nHotel Information:\n${knowledgeBase
          .map((kb) => `${kb.category} - ${kb.title}: ${kb.content}`)
          .join('\n')}`
      : '';

    return `You are an AI assistant for a hotel. A guest has sent the following message:

"${message}"

${language ? `The message is in ${language}.` : ''}
${kbContext}

Analyze this message and determine:
1. Which department should handle this request
2. Priority level (low, medium, high, urgent)
3. A brief title for the task
4. A summary of what needs to be done
5. Your confidence level (0-1)

Available departments:
- housekeeping: Room cleaning, towels, amenities
- maintenance: Repairs, technical issues, broken items
- front_desk: Check-in/out, billing, general inquiries
- concierge: Recommendations, bookings, tourist information
- room_service: Food and beverage orders
- it: Internet, TV, electronic device issues
- other: Anything that doesn't fit above categories

Respond in this EXACT JSON format:
{
  "department_type": "department_name",
  "priority": "low|medium|high|urgent",
  "title": "Brief task title",
  "summary": "Summary of the request",
  "confidence": 0.95
}`;
  }

  /**
   * Build prompt for generating guest response
   */
  private static buildResponsePrompt(
    message: string,
    knowledgeBase: KnowledgeBaseEntry[],
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    language?: string
  ): string {
    const kbContext = knowledgeBase.length > 0
      ? `\n\nHotel Information:\n${knowledgeBase
          .map((kb) => `${kb.category} - ${kb.title}: ${kb.content}`)
          .join('\n')}`
      : '';

    return `You are a helpful, professional AI concierge for a hotel. Your role is to:
1. Answer guest questions using the hotel knowledge base
2. Be warm, professional, and helpful
3. Respond in the same language as the guest
4. Keep responses concise and clear
5. For service requests, acknowledge and confirm a staff member will handle it

${kbContext}

Guest message: "${message}"

${language ? `Respond in ${language}.` : 'Detect the language and respond accordingly.'}

Important: If this is a service request (something that requires staff action), start your response with "[TASK_REQUIRED]" followed by your message.

Respond naturally and professionally:`;
  }

  /**
   * Parse analysis response from LLM
   */
  private static parseAnalysisResponse(response: string): AIAnalysisResult {
    try {
      // Extract JSON from response (handle cases where LLM adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        department_type: parsed.department_type as DepartmentType,
        priority: parsed.priority,
        title: parsed.title,
        summary: parsed.summary,
        confidence: parsed.confidence,
      };
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      // Fallback
      return {
        department_type: DepartmentType.CONCIERGE,
        priority: 'medium',
        title: 'Guest Request',
        summary: response.substring(0, 100),
        confidence: 0.5,
      };
    }
  }

  /**
   * Parse response and detect if task creation is required
   */
  private static async parseResponseWithTaskDetection(
    response: string,
    originalMessage: string,
    hotelId: string,
    language?: string
  ): Promise<AIResponse> {
    const requiresTask = response.startsWith('[TASK_REQUIRED]');
    const cleanedMessage = response.replace('[TASK_REQUIRED]', '').trim();

    const result: AIResponse = {
      message: cleanedMessage,
      language: language || 'en',
      requires_task: requiresTask,
    };

    if (requiresTask) {
      // Analyze the request for task creation
      const analysis = await this.analyzeGuestRequest(
        originalMessage,
        hotelId,
        language
      );
      result.task_info = analysis;
    }

    return result;
  }

  /**
   * Detect language of message
   */
  static async detectLanguage(message: string): Promise<string> {
    try {
      const prompt = `Detect the language of this message and respond with ONLY the ISO 639-1 language code (e.g., 'en', 'es', 'fr', 'de', 'ka' for Georgian, etc.):

"${message}"

Language code:`;

      const response = await this.callAnthropicAPI(prompt);
      return response.trim().toLowerCase().substring(0, 2);
    } catch (error) {
      console.error('Error detecting language:', error);
      return 'en';
    }
  }

  /**
   * Translate message
   */
  static async translateMessage(
    message: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      const prompt = `Translate the following message to ${targetLanguage}. Respond with ONLY the translation, no explanations:

"${message}"

Translation:`;

      return await this.callAnthropicAPI(prompt);
    } catch (error) {
      console.error('Error translating message:', error);
      return message;
    }
  }
}
