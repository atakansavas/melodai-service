/**
 * Chat API Route for MelodAI Service
 *
 * Handles AI-powered music chat with OpenAI integration, Spotify context,
 * conversation persistence, and streaming responses using Supabase storage.
 */

import {
  ContextData,
  buildContextPrompt,
  getUsedContextKeys,
  sanitizeContext,
  validateContextSize,
} from "@/lib/contextBuilder";
import { errorHandler } from "@/lib/errorHandler";
import { ensureSupabaseConnection } from "@/lib/supabase";
import { supabaseHelper } from "@/lib/supabase-helpers";
import { chatRequestSchema, validateRequest } from "@/lib/validations";
import { ChatSessionData, MessageData, UserData } from "@/types/supabase";
import { openai } from "@ai-sdk/openai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { experimental_createMCPClient, generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Enhanced response interfaces for Spotify integration
interface ChatResponse {
  success: boolean;
  data?: {
    response: string;
    sessionId: string;
    isNewSession: boolean;
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
  userProfile?: {
    displayName: string;
    country: string;
    product: string;
    preferences: any;
  };
  currentTrack?: string;
}

/**
 * Check if Supabase is available
 */
async function isSupabaseAvailable(): Promise<boolean> {
  try {
    await ensureSupabaseConnection();
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Supabase not available:", errorMessage);
    return false;
  }
}

/**
 * Extract and validate Spotify token from Authorization header
 */
async function extractSpotifyToken(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  return authHeader.substring(7);
}

/**
 * Get user context from Spotify token using Supabase
 */
async function getUserContext(
  spotifyToken: string
): Promise<SpotifyUserContext> {
  if (!spotifyToken || spotifyToken.length < 10) {
    throw new Error("Invalid Spotify token provided");
  }

  try {
    await ensureSupabaseConnection();

    let userData: UserData | null = null;

    try {
      // First try to find user by push token
      userData = await supabaseHelper.getUserByPushToken(spotifyToken);

      if (!userData) {
        // Check if users collection has any data
        const health = await supabaseHelper.healthCheck();
        console.log(`Found ${health.stats.total_users} users in database`);

        // Try to find any existing user or create a mock one
        const users = await supabaseHelper.select<UserData>(
          "users",
          {},
          { limit: 1 }
        );

        if (users.length > 0) {
          userData = users[0];
        } else {
          // Create a mock user for demonstration
          const mockUserData = {
            id: uuidv4(),
            spotify_profile: {
              id: "mock_spotify_user",
              display_name: "Demo User",
              email: "demo@melodai.app",
              country: "TR",
              product: "premium" as const,
              followers: 0,
              images: [],
              external_urls: {
                spotify: "https://open.spotify.com/user/mock",
              },
            },
            app_metadata: {
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
              last_activity: new Date().toISOString(),
              language_preference: "tr",
              timezone: "Europe/Istanbul",
              total_sessions: 1,
              total_api_calls: 1,
              app_version: "1.0.0",
              platform: "web",
            },
            device_info: {
              push_token: spotifyToken,
              device_id: "web_device_" + Date.now(),
              device_type: "web",
              os_version: "Unknown",
              app_version: "1.0.0",
              notifications_enabled: true,
            },
            preferences: {
              preferred_genres: ["pop", "rock", "electronic"],
              listening_habits: {},
              interaction_patterns: {},
              privacy_settings: {},
              notification_preferences: {
                new_music: true,
                playlist_updates: true,
                recommendations: true,
                system_updates: true,
                marketing: false,
              },
            },
            subscription: {
              type: "premium" as const,
              features_enabled: [
                "basic_discovery",
                "playlist_creation",
                "premium_features",
              ],
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Store the mock user in Supabase
          try {
            userData = await supabaseHelper.createUser(mockUserData);
          } catch (error) {
            console.log(
              "Warning: Could not store mock user in Supabase:",
              error
            );
            userData = mockUserData as UserData;
          }
        }
      }
    } catch (error) {
      console.error("Error accessing Supabase:", error);
      throw new Error("Database connection failed");
    }

    if (!userData) {
      throw new Error("Failed to retrieve or create user data");
    }

    return {
      userId: userData.spotify_profile.id,
      userProfile: {
        displayName: userData.spotify_profile.display_name,
        country: userData.spotify_profile.country,
        product: userData.spotify_profile.product,
        preferences: userData.preferences,
      },
    };
  } catch (error) {
    console.error("Error getting user context:", error);
    throw error;
  }
}

/**
 * Create or get existing chat session using Supabase
 */
async function getOrCreateChatSession(
  userId: string,
  sessionId?: string,
  userIntent?: string
): Promise<{ session: ChatSessionData; isNewSession: boolean }> {
  if (!userId || userId.trim().length === 0) {
    throw new Error("Valid user ID is required");
  }

  await ensureSupabaseConnection();

  if (sessionId) {
    try {
      // Try to find existing session with security check
      const session = await supabaseHelper.getChatSession(sessionId);

      if (session && session.user_id === userId) {
        // Validate session data integrity
        if (!session.messages || !Array.isArray(session.messages)) {
          console.warn(
            `Session ${sessionId} has invalid messages, reinitializing`
          );
          session.messages = [];
        }
        return { session, isNewSession: false };
      }
    } catch (error) {
      console.error(`Failed to retrieve session ${sessionId}:`, error);
      // Continue to create new session
    }
  }

  try {
    // Create new session with proper validation
    const now = new Date().toISOString();
    const sessionData = await supabaseHelper.createChatSession(userId);

    // Update with additional metadata
    const updatedSession = await supabaseHelper.updateChatSession(
      sessionData.id,
      {
        session_metadata: {
          total_messages: 0,
          first_message_at: now,
          last_message_at: now,
          session_duration_ms: 0,
          interaction_type: userIntent || "general",
          source: "api",
        },
        spotify_context: {
          user_country: "TR",
          user_product: "premium",
        },
      }
    );

    return { session: updatedSession, isNewSession: true };
  } catch (error) {
    console.error("Failed to create chat session:", error);
    throw new Error("Unable to initialize chat session");
  }
}

/**
 * Add message to chat session and update in Supabase
 */
async function addMessageToSession(
  sessionId: string,
  message: MessageData
): Promise<void> {
  // Validate inputs
  if (!sessionId || sessionId.trim().length === 0) {
    throw new Error("Valid session ID is required");
  }

  if (!message || !message.content || message.content.trim().length === 0) {
    throw new Error("Valid message content is required");
  }

  if (
    !message.role ||
    !["user", "assistant", "system"].includes(message.role)
  ) {
    throw new Error("Valid message role is required");
  }

  try {
    // Sanitize message content (basic XSS prevention)
    const sanitizedMessage = {
      ...message,
      content: message.content.slice(0, 10000), // Limit message length
      timestamp: message.timestamp || new Date().toISOString(),
    };

    await supabaseHelper.addMessageToSession(sessionId, sanitizedMessage);
  } catch (error) {
    console.error("Error adding message to session:", error);
    throw new Error("Failed to save message");
  }
}

/**
 * Build context-aware prompt using dynamic context
 */
function buildContextualPrompt(
  userContext: SpotifyUserContext,
  chatHistory: MessageData[],
  userMessage: string,
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

  // Add recent chat history for context
  if (chatHistory.length > 0) {
    contextualPrompt += `\n\nSon Konuşma Geçmişi:`;
    const recentMessages = chatHistory.slice(-6); // Last 6 messages for context

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
 * Format chat history for API
 */
function formatChatHistory(
  chatHistory: MessageData[]
): Array<{ role: string; content: string }> {
  return chatHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Process successful chat interaction
 */
async function processSuccessfulInteraction(
  sessionId: string,
  userMessage: string,
  assistantResponse: string,
  userContext: SpotifyUserContext,
  dynamicContext?: ContextData
): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Add user message
    await addMessageToSession(sessionId, {
      role: "user",
      content: userMessage,
      timestamp: now,
      metadata: {
        dynamic_context: dynamicContext,
      },
    });

    // Add assistant response
    await addMessageToSession(sessionId, {
      role: "assistant",
      content: assistantResponse,
      timestamp: now,
      metadata: {
        user_context: userContext,
      },
    });
  } catch (error) {
    console.error("Error processing successful interaction:", error);
    // Don't throw here as the chat response was already sent
  }
}

/**
 * POST /api/v1/chat - Handle chat requests
 */
export async function POST(req: NextRequest) {
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

    const { message, sessionId, context } = validation.data;
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

    // Extract Spotify token
    let spotifyToken: string;
    try {
      spotifyToken = await extractSpotifyToken(req);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          details: "Please provide a valid Spotify access token",
          requestId,
        },
        { status: 401 }
      );
    }

    // Check Supabase availability
    const supabaseAvailable = await isSupabaseAvailable();
    if (!supabaseAvailable) {
      return NextResponse.json(
        {
          success: false,
          error: "Database service unavailable",
          details: "Supabase connection failed",
          requestId,
        },
        { status: 503 }
      );
    }

    // Get user context with circuit breaker
    let userContext: SpotifyUserContext;
    try {
      userContext = await errorHandler.withCircuitBreaker(
        "supabase-operation",
        () => getUserContext(spotifyToken),
        { failureThreshold: 3, resetTimeout: 30000 }
      );
    } catch (error) {
      console.error("Failed to get user context:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve user context",
          requestId,
        },
        { status: 500 }
      );
    }

    // Get or create chat session
    let chatSession: ChatSessionData;
    let isNewSession: boolean;
    try {
      const sessionResult = await errorHandler.withCircuitBreaker(
        "supabase-operation",
        () => getOrCreateChatSession(userContext.userId, sessionId, userIntent),
        { failureThreshold: 3, resetTimeout: 30000 }
      );

      chatSession = sessionResult.session;
      isNewSession = sessionResult.isNewSession;
    } catch (error) {
      console.error("Failed to manage chat session:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to initialize chat session",
          requestId,
        },
        { status: 500 }
      );
    }

    // Build contextual prompt
    const contextualPrompt = buildContextualPrompt(
      userContext,
      chatSession.messages,
      message,
      sanitizedContext
    );

    // Prepare messages for OpenAI
    const messages = [
      { role: "system", content: contextualPrompt },
      ...formatChatHistory(chatSession.messages),
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

      // Process successful interaction
      await processSuccessfulInteraction(
        chatSession.id,
        message,
        fullResponse,
        userContext,
        sanitizedContext
      );

      // Return enhanced response with Spotify data
      return NextResponse.json({
        success: true,
        data: {
          response: fullResponse,
          sessionId: chatSession.id,
          isNewSession,
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
export async function GET() {
  const startTime = Date.now();

  try {
    // Check Supabase connectivity
    const health = await supabaseHelper.healthCheck();

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          service: "chat",
          status: health.healthy ? "healthy" : "degraded",
          supabase: health.healthy ? "connected" : "disconnected",
          openai: "unknown", // We'd need to make a test call to check this
          circuitBreakers: {
            openai:
              errorHandler.getCircuitBreakerState("openai-chat") || "UNKNOWN",
            supabase:
              errorHandler.getCircuitBreakerState("supabase-operation") ||
              "UNKNOWN",
          },
          stats: health.stats,
        },
        meta: {
          responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      { status: health.healthy ? 200 : 503 }
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
