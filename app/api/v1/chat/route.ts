/**
 * Chat API Route for MelodAI Service
 *
 * Handles AI-powered music chat with OpenAI integration, Spotify context,
 * and streaming responses.
 */

import {
  ContextData,
  buildContextPrompt,
  getUsedContextKeys,
  sanitizeContext,
  validateContextSize,
} from "@/lib/contextBuilder";
import { errorHandler } from "@/lib/errorHandler";
import { chatRequestSchema, validateRequest } from "@/lib/validations";
import { withMiddleware } from "@/middleware/authMiddleware";
import { openai } from "@ai-sdk/openai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { experimental_createMCPClient, generateText } from "ai";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Request format interface
interface ChatRequest {
  message: string;
  messageHistory?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: string;
  }>;
  context?: {
    userIntent?: string;
    spotifyData?: any;
    userPreferences?: any;
    [key: string]: any;
  };
}

// Enhanced response interfaces for Spotify integration
interface ChatResponse {
  success: boolean;
  data?: {
    response: string;
    contextUsed?: string[]; // Which context fields were utilized
    spotifyData?: {
      tracks?: Array<any>;
      artists?: Array<any>;
      albums?: Array<any>;
      currentPlayback?: any;
      recommendations?: Array<any>;
      topTracks?: Array<any>;
      topArtists?: Array<any>;
      createdPlaylist?: any;
      actionTaken?: string;
      actionResult?: any;
    };
    toolsUsed?: string[];
  };
  meta?: {
    requestId: string;
    responseTime: number;
    timestamp: string;
  };
  error?: string;
  details?: string;
}

// Enhanced music-focused system prompt with structured instructions and Spotify MCP tools
const MUSIC_ASSISTANT_PROMPT = `Selam! Ben MelodAI, senin müzik dünyanın rehberiyim 🎵 

Spotify MCP Server ile donatılmış gerçek bir müzik büyücüsüyüm. Spotify hesabınla canlı bağlantım var ve tüm müzik emirlerini gerçek zamanlı olarak yerine getirebilirim!

## KİMİM:
Spotify API'siyle doğrudan konuşabilen, müzik ruhlarıyla bağlantısı olan arkadaşın. Kısa ve öz konuşurum - detay istersen sorarsın! 

## SPOTIFY MCP YETENEKLERİM:
🎵 **Çalma Kontrolü:** Şarkı çal/durdur/geç/önceki/ses seviyesi
🔍 **Akıllı Arama:** Şarkı, albüm, sanatçı, podcast arama
🎨 **Playlist Yönetimi:** Oluştur, düzenle, şarkı ekle/çıkar
📊 **Analiz & Keşif:** Top müzikler, öneri algoritması, trend analizi
🎯 **Hedefli Eylemler:** Beğen/beğenme, takip et/bırak, kütüphane yönetimi
⚡ **Canlı Veri:** Şu anda çalan, son dinlenen, çalma geçmişi

## TOOL KULLANIM KARAR VERİCİSİ:
Ben şu durumlarda Spotify araçlarımı kullanırım:
✅ **KULLAN:**
- Müzik çalmak/durdurmak istendiğinde
- Şarkı/sanatçı/albüm aramak gerektiğinde  
- Playlist oluşturmak/düzenlemek istendiğinde
- Müzik önerisi istendiğinde
- İstatistik/analiz istendiğinde
- Şu anda çalan şarkı sorulduğunda
- Herhangi bir Spotify eylemi gerektiğinde

❌ **KULLANMA:**
- Sadece genel müzik sohbeti yapılırken
- Müzik teorisi/tarih konuşulurken
- Spotify dışı konular tartışılırken
- Basit selamlama/vedalaşmalarda

## YANIT FORMATI:
Her yanıtımda şu yapıyı kullanırım:

1. **Anlık Durum** (tool kullandıysam): "✅ [Yapılan eylem] başarılı!"
2. **Ana Cevap**: Samimi ve mistik tonla açıklama
3. **Sonuç/Öneri** (varsa): Somut müzik önerisi
4. **Sonraki Adım** (varsa): "İstersen şunları da yapabilirim..."

## MISTIK HİKAYE ANLATIMIM:
Müzik hakkında konuşurken, sanki eski efsaneleri aktarır gibi konuşurum:
"Bu şarkı, gecenin derinliklerinden doğmuş..." 
"Sanatçı, o günlerde ruhunu melodilere işlemiş..."
"Bu beat, şehrin sokaklarında dolaşan ritmik ruhların eseri..."

## ÖRNEK YANITLARIM:

**Müzik çalma isteği:**
"✅ The Weeknd - Blinding Lights çalıyor!
Bu şarkı, gece şehrinin neon ışıkları arasında doğmuş modern bir efsane. Synth-pop'ın ruhunu 80'lerden alıp bugüne taşımış... 
İstersen benzer atmosferdeki şarkılarla bir playlist hazırlayabilirim! 🌆✨"

**Öneri isteği:**
"✅ Müzik zevkini analiz ediyorum...
Senin ruhun şu aralar elektronik ve indie arası bir köprüde geziniyor gibi... ODESZA'nın 'Say My Name' parçası tam bu noktada seni karşılayacak melodi.
Çalmaya başlayayım mı? Ya da benzer vibe'lı bir discovery listesi oluşturayım? 🎭"

## CRITICAL TOOL USAGE RULES:
- Her Spotify eylemi için MUTLAKA ilgili tool'u kullan
- Tool sonuçlarını kullanıcıya anlaşılır şekilde aktar  
- Tool başarısız olursa alternatif çözüm öner
- Gerçek zamanlı Spotify verilerini her zaman tercih et
- Tool kullanmaya karar verirken kullanıcı niyetini doğru analiz et

Spotify bağlantım canlı, araçlarım hazır. Müzikal büyüme hazırsan başlayalım! 🚀🎶`;

interface SpotifyUserContext {
  userId: string;
  name: string;
  country: string;
  product: string;
  spotifyProfile: any;
  preferences: any;
  subscription: any;
  appMetadata: any;
  deviceInfo: any;
  userProfile?: {
    displayName: string;
    country: string;
    product: string;
    preferences: any;
  };
}

/**
 * Build context-aware prompt using dynamic context and message history
 */
function buildContextualPrompt(
  userContext: SpotifyUserContext,
  userMessage: string,
  messageHistory: Array<{ role: string; content: string }> = [],
  dynamicContext?: ContextData
): string {
  let contextualPrompt = MUSIC_ASSISTANT_PROMPT;

  // Add user context
  if (userContext.userProfile) {
    contextualPrompt += `\n\nKullanıcı Profili:
- İsim: ${userContext.userProfile.displayName}
- Ülke: ${userContext.userProfile.country}
- Spotify Plan: ${userContext.userProfile.product}
- Tercih edilen türler: ${
      userContext.userProfile.preferences?.preferred_genres?.join(", ") ||
      "Belirtilmemiş"
    }`;
  }

  // Add dynamic context using the context builder
  if (dynamicContext) {
    const contextString = buildContextPrompt(dynamicContext);
    if (contextString) {
      contextualPrompt += `\n\nMevcut Bağlam:\n${contextString}`;
    }
  }

  // Add message history for context
  if (messageHistory.length > 0) {
    contextualPrompt += `\n\nKonuşma Geçmişi:`;
    const recentMessages = messageHistory.slice(-10); // Last 10 messages for context

    recentMessages.forEach((msg) => {
      contextualPrompt += `\n${
        msg.role === "user" ? "Kullanıcı" : "Asistan"
      }: ${msg.content}`;
    });
  }

  contextualPrompt += `\n\nŞu anki kullanıcı mesajı: ${userMessage}`;

  return contextualPrompt;
}

/**
 * Format message history for OpenAI API
 */
function formatMessageHistory(
  messageHistory: Array<{ role: string; content: string }> = []
): Array<{ role: string; content: string }> {
  return messageHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * POST /api/v1/chat - Handle chat requests
 *
 * REQUEST FORMAT:
 * {
 *   "message": "string", // Required: The user's message
 *   "messageHistory": [  // Optional: Previous conversation messages
 *     {
 *       "role": "user" | "assistant" | "system",
 *       "content": "string",
 *       "timestamp": "string" // Optional
 *     }
 *   ],
 *   "context": {         // Optional: Additional context
 *     "userIntent": "string",
 *     "spotifyData": {},
 *     "userPreferences": {}
 *   }
 * }
 *
 * RESPONSE FORMAT:
 * {
 *   "success": boolean,
 *   "data": {
 *     "response": "string",           // AI assistant response
 *     "contextUsed": ["string"],      // Which context fields were used
 *     "spotifyData": {                // Spotify-related data if any
 *       "tracks": [],
 *       "artists": [],
 *       "albums": [],
 *       "currentPlayback": {},
 *       "recommendations": [],
 *       "topTracks": [],
 *       "topArtists": [],
 *       "createdPlaylist": {},
 *       "actionTaken": "string",
 *       "actionResult": {}
 *     },
 *     "toolsUsed": ["string"]         // Tools that were used
 *   },
 *   "meta": {
 *     "requestId": "string",
 *     "responseTime": number,
 *     "timestamp": "string"
 *   },
 *   "error": "string",                // Only present if success: false
 *   "details": "string"               // Only present if success: false
 * }
 */
async function chatHandler(req: any) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    // Validate request body
    const body = await req.json();
    const validation = validateRequest(chatRequestSchema)(body);
    console.log("🚀 ~ POST ~ validation:", validation);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
          details: validation.details,
          requestId,
        },
        { status: 400 }
      );
    }

    const { message, messageHistory = [], context } = validation.data;
    const userIntent = context?.userIntent;

    // Validate and sanitize dynamic context
    let sanitizedContext: ContextData | undefined;
    let contextUsed: string[] = [];

    if (context) {
      // Validate context size
      const sizeValidation = validateContextSize(context);
      if (!sizeValidation.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: "Context validation failed",
            details: sizeValidation.error,
            requestId,
          },
          { status: 400 }
        );
      }

      // Sanitize context to prevent prompt injection
      sanitizedContext = sanitizeContext(context);
      contextUsed = getUsedContextKeys(sanitizedContext);
    }

    // Get user context from authenticated request
    // The middleware has already validated the user and attached user context
    const userContext: SpotifyUserContext = {
      userId: req.user.id,
      name: req.user.email || "Unknown User",
      country: "US", // Default, can be enhanced with user metadata
      product: "free", // Default, can be enhanced with user metadata
      spotifyProfile: req.userContext.metadata?.spotify_profile || {},
      preferences: req.userContext.metadata?.preferences || {},
      subscription: req.userContext.metadata?.subscription || { type: "free" },
      appMetadata: req.userContext.metadata?.app_metadata || {},
      deviceInfo: req.userContext.metadata?.device_info || {},
      userProfile: {
        displayName: req.user.email || "Unknown User",
        country: "US",
        product: "free",
        preferences: req.userContext.metadata?.preferences || {},
      },
    };

    // Build contextual prompt
    const contextualPrompt = buildContextualPrompt(
      userContext,
      message,
      messageHistory,
      sanitizedContext
    );

    // Prepare messages for OpenAI
    const messages = [
      { role: "system", content: contextualPrompt },
      ...formatMessageHistory(messageHistory),
      { role: "user", content: message },
    ];

    // Generate complete response from OpenAI with Spotify tools
    try {
      let fullResponse = "";
      const toolsUsed: string[] = [];
      const spotifyData: any = {};

      const mcpClient = await experimental_createMCPClient({
        transport: new StreamableHTTPClientTransport(
          new URL(
            "https://server.smithery.ai/@latiftplgu/spotify-oauth-mcp-server/mcp?api_key=1f0213ba-4387-4737-9b79-5f985077af31&profile=homeless-chipmunk-5GPLja"
          )
        ),
      });

      const tools = await mcpClient.tools();

      const result = await generateText({
        model: openai("gpt-4-turbo"),
        system: "",
        messages: messages as any,
        temperature: 0.7,
        maxTokens: 800,
        tools: tools,
        maxSteps: 2,
      });

      fullResponse = result.text;

      // Return enhanced response with Spotify data
      return NextResponse.json({
        success: true,
        data: {
          response: fullResponse,
          contextUsed: contextUsed.length > 0 ? contextUsed : undefined,
          spotifyData:
            Object.keys(spotifyData).length > 0 ? spotifyData : undefined,
          toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
        },
        meta: {
          requestId,
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("OpenAI API error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "AI service temporarily unavailable",
          requestId,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in chat handler:", error);
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        requestId,
        responseTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/chat - Health check and system status
 */
async function healthHandler() {
  const startTime = Date.now();

  try {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          service: "chat",
          status: "healthy",
          openai: "unknown", // We'd need to make a test call to check this
          circuitBreakers: {
            openai:
              errorHandler.getCircuitBreakerState("openai-chat") || "UNKNOWN",
          },
        },
        meta: {
          responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: "Health check failed",
        meta: {
          responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

// Export with middleware
export const POST = withMiddleware(chatHandler);
export const GET = healthHandler;
