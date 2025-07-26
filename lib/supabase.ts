import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";

// Supabase configuration interface
export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  serviceKey?: string;
  options?: {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
    };
    db?: {
      schema?: string;
    };
    global?: {
      headers?: Record<string, string>;
    };
  };
}

// Create Supabase client with proper typing
function createSupabaseClient(config: SupabaseConfig = {}) {
  const supabaseUrl = config.url || process.env.SUPABASE_URL;
  const supabaseKey = config.anonKey || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
    );
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      ...config.options?.auth,
    },
    global: {
      headers: {
        "Content-Type": "application/json",
        ...config.options?.global?.headers,
      },
    },
  });
}

// Create service role client for admin operations
function createSupabaseServiceClient(config: SupabaseConfig = {}) {
  const supabaseUrl = config.url || process.env.SUPABASE_URL;
  const serviceKey = config.serviceKey || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing Supabase service configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
    );
  }

  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Default client instances
export const supabase = createSupabaseClient();
export const supabaseService = createSupabaseServiceClient();

// Export configuration function for custom clients
export const configureSupabase = (config: SupabaseConfig) => {
  return createSupabaseClient(config);
};

export const configureSupabaseService = (config: SupabaseConfig) => {
  return createSupabaseServiceClient(config);
};

// Connection health check
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    return !error;
  } catch (error) {
    console.error("Supabase connection check failed:", error);
    return false;
  }
}

// Database initialization helper
export async function ensureSupabaseConnection(): Promise<void> {
  const isConnected = await checkSupabaseConnection();
  if (!isConnected) {
    throw new Error(
      "Supabase connection failed. Please check your configuration."
    );
  }
}
