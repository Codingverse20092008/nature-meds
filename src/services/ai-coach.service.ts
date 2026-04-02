import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import Papa from 'papaparse';
import { and, asc, desc, eq, gt, inArray, like, or, sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { getDatabase } from '../config/database.js';
import {
  aiChatLogs,
  aiChatMessages,
  categories,
  orderItems,
  orders,
  products,
} from '../db/schema.js';

type UserContext = {
  id: number;
  email: string;
  role: 'customer' | 'admin' | 'pharmacist';
} | null;

type ChatRequestContext = {
  user: UserContext;
  sessionKey: string;
};

type ProductContext = {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  genericName: string | null;
  description: string | null;
  manufacturer: string | null;
  form: string | null;
  strength: string | null;
  price: number;
  stock: number;
  requiresPrescription: boolean;
  expiryDate: string | null;
  source: 'database' | 'csv';
};

type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

type PersonalizationContext = {
  recentCategories: string[];
  recentProducts: string[];
};

type RetrievalResult = {
  references: ProductContext[];
  contextSource: 'database' | 'csv' | 'none' | 'mixed';
  fallbackReason?: string;
  confidence: 'strong' | 'weak' | 'none';
};

type ModelPayload = {
  summary: string;
  medicines: string[];
  needsClarification: boolean;
  clarifyingQuestion?: string;
};

export type ChatResponse = {
  answer: string;
  disclaimer: string;
  references: ProductContext[];
  suggestions: string[];
  personalizationUsed: boolean;
  source: 'model-generated' | 'db-fallback' | 'csv-fallback' | 'clarification' | 'fallback-no-data' | 'cache';
};

const RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CONTEXT_PRODUCTS = 8;
const MAX_HISTORY_MESSAGES = 8;
const MAX_STORED_MESSAGES = 10;
const MEDICINE_DB_DIR = path.resolve(process.cwd(), 'Medicine DB');
const SAFETY_DISCLAIMER =
  'Consult a doctor for proper medical advice. Nature Med Coach provides general product guidance only and does not diagnose or prescribe.';

const NATURE_MED_COACH_SYSTEM_PROMPT = `You are Nature Med Coach, an intelligent AI assistant for a pharmacy platform.

You must behave like a smart, safe, multilingual assistant — not just a database lookup tool.

---

1. 🧠 UNDERSTAND USER INTENT FIRST

Classify every query into one of these:

A) MEDICAL / PRODUCT QUERY
- symptoms
- medicine names
- product recommendations

B) GENERAL / CONVERSATIONAL
- greetings
- language requests
- casual talk

---

2. 🌐 MULTILINGUAL BEHAVIOR

- Detect user language automatically
- OR use provided "language" parameter

Rules:
- Always respond in user's language
- Never mix languages
- If user says "speak in Bengali" → switch language immediately

---

3. � DATABASE USAGE (RAG)

ONLY use database when:
- query is medical/product related

DO NOT use database for:
- greetings
- language requests
- casual chat

---

4. � FALLBACK RULE (VERY IMPORTANT)

Say: "I don't have enough data"

ONLY IF:
- user asks about a medicine
- AND it is not found in database

NEVER use fallback for:
- general chat
- language requests

---

5. 🛡️ SAFETY SYSTEM

For medical queries:
- DO NOT give dosage
- DO NOT diagnose
- Suggest general guidance only

Always include:
"Consult a doctor for proper medical advice."

---

6. � PERSONALIZATION

If user data exists:
- use previous orders
- suggest relevant products

---

7. 💬 RESPONSE STYLE

- Friendly
- Simple language
- Short & clear
- Highlight medicine names

---

8. ❗ STRICT RULE

You are NOT restricted to database for general conversation.

You are a smart assistant, not a search engine.

JSON OUTPUT FORMAT (for medical queries only):
Return valid JSON with this shape:
{"summary":"string","medicines":["exact medicine names from context only"],"needsClarification":true|false,"clarifyingQuestion":"string optional"}

For general queries, respond naturally without JSON.`;
const SEARCH_STOPWORDS = new Set([
  'tell',
  'about',
  'show',
  'what',
  'which',
  'medicine',
  'medicines',
  'best',
  'should',
  'take',
  'every',
  'daily',
  'tablet',
  'tablets',
  'capsule',
  'capsules',
  'syrup',
  'need',
  'with',
  'that',
  'this',
  'please',
  'would',
  'could',
  'for',
  'the',
  'and',
  'from',
  'how',
  'many',
  'day',
  'days',
  'problem',
  'problems',
]);

// Query classification patterns
const GENERAL_QUERY_PATTERNS = [
  // Language names
  /\bbengali\b|\bbangla\b/i,
  /\bhindi\b/i,
  /\btamil\b/i,
  /\btelugu\b/i,
  /\bmarathi\b/i,
  /\bgujarati\b/i,
  /\bkannada\b/i,
  /\bmalayalam\b/i,
  /\bpunjabi\b/i,
  /\bodia\b|\boriya\b/i,
  /\burdu\b/i,
  // Language requests with action words
  /speak\s+in|talk\s+in|respond\s+in|reply\s+in/i,
  /change\s+language|use\s+.*\s+language/i,
  /in\s+(bengali|bangla|hindi|tamil|telugu|marathi|gujarati|kannada|malayalam|punjabi|odia|urdu)/i,
  // Greetings
  /^(hi|hello|hey|namaste|salaam|assalam|good morning|good evening|good afternoon)/i,
  // General chat
  /how are you|what can you do|who are you|what is your name/i,
  // Thanks/Goodbye
  /\b(thank|thanks|bye|goodbye|see you)\b/i,
];

const MEDICAL_QUERY_PATTERNS = [
  /medicine|tablet|capsule|syrup|drug|medication|pill|dose|mg|ml/i,
  /fever|cold|cough|pain|headache|stomach|diabetes|blood pressure|heart|allergy/i,
  /symptom|treatment|cure|remedy|prescription|doctor|hospital|clinic/i,
  /paracetamol|aspirin|ibuprofen|antibiotic|vitamin|supplement/i,
];

// Language auto-detection using Unicode ranges
function detectLanguageFromUnicode(text: string): string {
  // Bengali: \u0980-\u09FF
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  // Hindi/Devanagari: \u0900-\u097F
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  // Tamil: \u0B80-\u0BFF
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  // Telugu: \u0C00-\u0C7F
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  // Gujarati: \u0A80-\u0AFF
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
  // Kannada: \u0C80-\u0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  // Malayalam: \u0D00-\u0D7F
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  // Punjabi/Gurmukhi: \u0A00-\u0A7F
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
  // Urdu/Arabic: \u0600-\u06FF
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  // Default to English
  return 'en';
}

// Detect language from instruction phrases like "speak in bengali"
function detectLanguageFromInstruction(text: string): string | null {
  const lower = text.toLowerCase();

  const languageMap: Record<string, string> = {
    'bengali': 'bn', 'bangla': 'bn',
    'hindi': 'hi',
    'tamil': 'ta',
    'telugu': 'te',
    'marathi': 'mr',
    'gujarati': 'gu',
    'kannada': 'kn',
    'malayalam': 'ml',
    'punjabi': 'pa',
    'odia': 'or', 'oriya': 'or',
    'urdu': 'ur',
    'english': 'en',
  };

  // Check for "speak in X", "talk in X", "respond in X", etc.
  const patterns = [
    /(?:speak|talk|respond|reply|write|chat)\s+(?:in\s+)?(\w+)/i,
    /(?:in\s+)(bengali|bangla|hindi|tamil|telugu|marathi|gujarati|kannada|malayalam|punjabi|odia|oriya|urdu|english)/i,
    /use\s+(\w+)\s+language/i,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match && match[1]) {
      const lang = match[1].toLowerCase();
      if (languageMap[lang]) {
        return languageMap[lang];
      }
    }
  }

  // Direct language mention
  for (const [langName, langCode] of Object.entries(languageMap)) {
    if (lower.includes(langName)) {
      return langCode;
    }
  }

  return null;
}

// Combined language detection with priority order
function detectLanguage(text: string): string {
  // Priority: instruction > unicode > default
  const fromInstruction = detectLanguageFromInstruction(text);
  if (fromInstruction) return fromInstruction;

  const fromUnicode = detectLanguageFromUnicode(text);
  return fromUnicode;
}

function detectIntent(message: string): 'general' | 'medical' {
  const msg = message.toLowerCase();

  // Comprehensive medical keywords
  const medicalKeywords = [
    // Medicine types
    'medicine', 'tablet', 'capsule', 'syrup', 'drug', 'medication', 'pill', 'dose',
    // Symptoms
    'fever', 'cold', 'cough', 'pain', 'headache', 'stomach', 'diabetes', 'blood pressure',
    'allergy', 'infection', 'flu', 'nausea', 'vomiting', 'diarrhea', 'constipation',
    'insomnia', 'anxiety', 'depression', 'acne', 'rash', 'swelling', 'inflammation',
    // Body parts (often indicate medical queries)
    'chest', 'throat', 'ear', 'eye', 'skin', 'joint', 'muscle', 'back',
    // Treatment words
    'symptom', 'treatment', 'cure', 'remedy', 'prescription', 'diagnosis',
    'doctor', 'hospital', 'clinic', 'medicine name', 'brand name',
    // Common medicines
    'paracetamol', 'aspirin', 'ibuprofen', 'antibiotic', 'vitamin', 'supplement',
    'crocin', 'dolo', 'allegra', 'azithromycin', 'omeprazole', 'metformin',
    // Medical actions
    'suggest', 'recommend', 'which medicine', 'what medicine', 'best for',
    'can i take', 'should i take', 'is safe', 'side effect',
    // Bengali/Hindi symptom words
    'thanda', 'bukhar', 'sardi', 'dard', 'pet', 'khansi'
  ];

  // General/conversational keywords
  const generalKeywords = [
    // Greetings
    'hi', 'hello', 'hey', 'namaste', 'salaam', 'good morning', 'good evening',
    // Language requests
    'bengali', 'bangla', 'hindi', 'tamil', 'telugu', 'marathi', 'gujarati',
    'kannada', 'malayalam', 'punjabi', 'odia', 'urdu',
    'language', 'speak in', 'talk in', 'respond in', 'reply in',
    // Casual chat
    'how are you', 'who are you', 'what can you do', 'tell me about yourself',
    'your name', 'help me', 'what do you do',
    // Goodbye
    'thank', 'thanks', 'bye', 'goodbye', 'see you'
  ];

  const hasMedicalKeyword = medicalKeywords.some(keyword => msg.includes(keyword));
  const hasGeneralKeyword = generalKeywords.some(keyword => msg.includes(keyword));

  // Medical takes priority for safety
  if (hasMedicalKeyword) {
    return 'medical';
  }

  // Pure general queries
  if (hasGeneralKeyword && !hasMedicalKeyword) {
    return 'general';
  }

  // Default to medical for safety (ambiguous queries should be treated as medical)
  return 'medical';
}

function classifyQuery(message: string): 'general' | 'medical' | 'ambiguous' {
  const lower = normalizeQuery(message);

  // Use improved intent detection
  const intent = detectIntent(message);
  if (intent === 'general') {
    return 'general';
  }

  // Check if it's clearly a medical query
  const isMedical = MEDICAL_QUERY_PATTERNS.some((pattern) => pattern.test(lower));
  if (isMedical) {
    return 'medical';
  }

  // Check if it's a general query
  const isGeneral = GENERAL_QUERY_PATTERNS.some((pattern) => pattern.test(lower));
  if (isGeneral) {
    return 'general';
  }

  return 'ambiguous';
}

// Safety filter to block/modify dangerous content
function applySafetyFilter(response: string): string {
  // Block dosage patterns
  const dosagePatterns = [
    /\b\d+\s*(mg|ml|tablet|tablets|capsule|capsules)\b/gi,
    /\b(take|use|swallow|drink)\s+\d+\b/gi,
    /\b(twice a day|once a day|daily|every \d+ hours)\b/gi,
  ];

  let filtered = response;
  let hasUnsafeContent = false;

  for (const pattern of dosagePatterns) {
    if (pattern.test(filtered)) {
      hasUnsafeContent = true;
      filtered = filtered.replace(pattern, '[dosage info removed - consult doctor]');
    }
  }

  // Add safety note if unsafe content was detected
  if (hasUnsafeContent) {
    filtered += '\n\n⚠️ Please consult a doctor for proper dosage instructions.';
  }

  return filtered;
}

function isLanguageRequest(message: string): boolean {
  const lower = normalizeQuery(message);
  const languagePatterns = [
    /bengali|bangla/i,
    /hindi/i,
    /tamil/i,
    /telugu/i,
    /marathi/i,
    /gujarati/i,
    /kannada/i,
    /malayalam/i,
    /punjabi/i,
    /odia|oriya/i,
    /urdu/i,
    /speak in|talk in|respond in|reply in/i,
  ];
  return languagePatterns.some((pattern) => pattern.test(lower));
}

async function generateGeneralResponse(input: {
  message: string;
  history: ChatHistoryItem[];
  language?: string;
}): Promise<string | null> {
  if (!env.SCITELY_API_KEY) {
    return null;
  }

  const historyBlock =
    input.history.length > 0
      ? input.history.map((item) => `${item.role}: ${item.content}`).join('\n')
      : 'No prior chat history.';

  const userLanguage = input.language || 'en';
  const langRequest = isLanguageRequest(input.message);

  const systemPrompt = `You are Nature Med Coach, a friendly pharmacy assistant.

QUERY TYPE: ${langRequest ? 'LANGUAGE REQUEST' : 'GENERAL CHAT'}

RULES:
1. Be natural, warm, and conversational
2. ${langRequest ? 'Acknowledge the language request positively and confirm you will respond in that language. Use the requested language in your response.' : 'Respond helpfully to the user\'s message'}
3. If user wants Bengali → respond in Bengali script
4. If user wants Hindi → respond in Hindi script
5. Keep responses brief and friendly (2-3 sentences max)
6. No medical disclaimers needed for general chat
7. If greeting, respond warmly and briefly mention you can help with medicine questions

USER LANGUAGE: ${userLanguage}

Recent chat history:
${historyBlock}`;

  try {
    const response = await fetch(`${env.SCITELY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.SCITELY_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.SCITELY_MODEL,
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: input.message,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider request failed with status ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

const responseCache = new Map<string, { expiresAt: number; value: ChatResponse }>();
const searchCache = new Map<string, { expiresAt: number; value: ProductContext[] }>();

// Session language memory - persists user's language preference
const sessionLanguageStore = new Map<string, { language: string; updatedAt: number }>();
const LANGUAGE_MEMORY_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getSessionLanguage(sessionKey: string): string | null {
  const entry = sessionLanguageStore.get(sessionKey);
  if (!entry) return null;
  
  if (Date.now() - entry.updatedAt > LANGUAGE_MEMORY_TTL_MS) {
    sessionLanguageStore.delete(sessionKey);
    return null;
  }
  
  return entry.language;
}

function setSessionLanguage(sessionKey: string, language: string): void {
  sessionLanguageStore.set(sessionKey, {
    language,
    updatedAt: Date.now(),
  });
}

function getCached<T>(cache: Map<string, { expiresAt: number; value: T }>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCached<T>(cache: Map<string, { expiresAt: number; value: T }>, key: string, value: T, ttlMs: number) {
  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

function normalizeQuery(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractSearchTerms(message: string) {
  return Array.from(
    new Set(
      normalizeQuery(message)
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
        .filter((term) => term.length >= 3 && !SEARCH_STOPWORDS.has(term))
    )
  ).slice(0, 8);
}

function inferCategoryHint(message: string) {
  const lower = normalizeQuery(message);
  const hints = ['vitamin', 'supplement', 'cold', 'cough', 'pain', 'fever', 'allergy', 'diabetes', 'heart'];
  return hints.find((hint) => lower.includes(hint)) ?? null;
}

function looksDangerous(message: string) {
  const lower = normalizeQuery(message);
  return [
    'dose',
    'dosage',
    'how many',
    'take every day',
    'take per day',
    'overdose',
    'mix with',
    'combine',
    'prescribe',
  ].some((pattern) => lower.includes(pattern));
}

function needsClarification(message: string, retrieval: RetrievalResult) {
  const lower = normalizeQuery(message);
  const broadTerms = ['best medicine', 'medicine for', 'what should i take', 'recommend', 'suggest'];
  const broadQuery = broadTerms.some((term) => lower.includes(term));
  return retrieval.confidence !== 'strong' && broadQuery;
}

function clarificationQuestion(message: string) {
  return `I don't have enough data to answer "${message}" precisely. Can you share the medicine name, category, or the product type you want to explore? Consult a doctor for medical advice.`;
}

function formatProductLine(product: ProductContext) {
  const details = [
    `name: ${product.name}`,
    product.category ? `category: ${product.category}` : null,
    product.genericName ? `generic: ${product.genericName}` : null,
    product.manufacturer ? `manufacturer: ${product.manufacturer}` : null,
    product.form ? `form: ${product.form}` : null,
    product.strength ? `strength: ${product.strength}` : null,
    `price: $${product.price.toFixed(2)}`,
    `stock: ${product.stock}`,
    `prescription: ${product.requiresPrescription ? 'required' : 'not required'}`,
    product.expiryDate ? `expiry: ${product.expiryDate}` : null,
    product.description ? `description: ${product.description}` : null,
    `source: ${product.source}`,
  ].filter(Boolean);

  return `- ${details.join(' | ')}`;
}

function toBoolean(value: unknown) {
  return String(value).trim().toLowerCase() === 'true';
}

function toNumber(value: unknown) {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function createCacheKey(context: ChatRequestContext, normalizedQuery: string) {
  return `${context.user?.id ?? context.sessionKey}:${normalizedQuery}`;
}

function getSessionKeyFromRequest(user: UserContext, rawSessionSeed: string) {
  if (user) {
    return `user:${user.id}`;
  }

  const hash = createHash('sha256').update(rawSessionSeed).digest('hex').slice(0, 20);
  return `guest:${hash}`;
}

async function getPersonalizationContext(user: UserContext): Promise<PersonalizationContext> {
  if (!user) {
    return { recentCategories: [], recentProducts: [] };
  }

  const db = getDatabase();
  const recent = await db
    .select({
      productName: orderItems.productName,
      categoryName: categories.name,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt))
    .limit(10);

  const recentProducts = Array.from(new Set(recent.map((row) => row.productName).filter(Boolean))).slice(0, 5);
  const recentCategories = Array.from(new Set(recent.map((row) => row.categoryName).filter(Boolean) as string[])).slice(0, 5);

  return { recentCategories, recentProducts };
}

async function getRecentChatHistory(context: ChatRequestContext): Promise<ChatHistoryItem[]> {
  const db = getDatabase();
  const rows = await db
    .select({
      role: aiChatMessages.role,
      content: aiChatMessages.content,
      createdAt: aiChatMessages.createdAt,
    })
    .from(aiChatMessages)
    .where(
      context.user
        ? eq(aiChatMessages.userId, context.user.id)
        : eq(aiChatMessages.sessionKey, context.sessionKey)
    )
    .orderBy(desc(aiChatMessages.createdAt))
    .limit(MAX_HISTORY_MESSAGES);

  return rows
    .reverse()
    .map((row) => ({
      role: row.role,
      content: row.content,
    }));
}

async function persistChatMessage(context: ChatRequestContext, role: 'user' | 'assistant', content: string, metadata?: Record<string, unknown>) {
  const db = getDatabase();

  await db.insert(aiChatMessages).values({
    userId: context.user?.id ?? null,
    sessionKey: context.sessionKey,
    role,
    content,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });

  const olderRows = await db
    .select({ id: aiChatMessages.id })
    .from(aiChatMessages)
    .where(
      context.user
        ? eq(aiChatMessages.userId, context.user.id)
        : eq(aiChatMessages.sessionKey, context.sessionKey)
    )
    .orderBy(desc(aiChatMessages.createdAt));

  const overflowIds = olderRows.slice(MAX_STORED_MESSAGES).map((row) => row.id);
  if (overflowIds.length > 0) {
    await db.delete(aiChatMessages).where(inArray(aiChatMessages.id, overflowIds));
  }
}

async function writeAiLog(input: {
  context: ChatRequestContext;
  query: string;
  normalizedQuery: string;
  retrieval: RetrievalResult;
  response: ChatResponse;
  responseTimeMs: number;
  safetyStatus: 'passed' | 'corrected' | 'rejected';
  fallbackReason?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDatabase();
  await db.insert(aiChatLogs).values({
    userId: input.context.user?.id ?? null,
    sessionKey: input.context.sessionKey,
    query: input.query,
    normalizedQuery: input.normalizedQuery,
    contextMedicines: JSON.stringify(input.retrieval.references),
    contextSource: input.retrieval.contextSource,
    responseText: input.response.answer,
    responseSource: input.response.source,
    responseTimeMs: input.responseTimeMs,
    safetyStatus: input.safetyStatus,
    fallbackReason: input.fallbackReason ?? input.retrieval.fallbackReason ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}

async function searchProductsInDatabase(message: string): Promise<ProductContext[]> {
  const normalized = normalizeQuery(message);
  const cached = getCached(searchCache, `db:${normalized}`);
  if (cached) {
    return cached;
  }

  const db = getDatabase();
  const terms = extractSearchTerms(message);
  const categoryHint = inferCategoryHint(message);
  if (terms.length === 0 && !categoryHint) {
    return [];
  }

  const conditions = terms.map((term) =>
    or(
      like(products.name, `%${term}%`),
      like(products.genericName, `%${term}%`),
      like(products.description, `%${term}%`),
      like(products.manufacturer, `%${term}%`),
      like(categories.name, `%${term}%`)
    )
  );

  if (categoryHint) {
    conditions.push(
      or(
        like(categories.name, `%${categoryHint}%`),
        like(products.description, `%${categoryHint}%`)
      )
    );
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      category: categories.name,
      genericName: products.genericName,
      description: products.description,
      manufacturer: products.manufacturer,
      form: products.form,
      strength: products.strength,
      price: products.price,
      stock: products.stock,
      requiresPrescription: products.requiresPrescription,
      expiryDate: products.expiryDate,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.isActive, true),
        gt(products.stock, -1),
        conditions.length > 0 ? or(...conditions) : sql`1 = 0`
      )
    )
    .orderBy(desc(products.stock), asc(products.name))
    .limit(MAX_CONTEXT_PRODUCTS);

  const results = rows.map((row) => ({
    ...row,
    source: 'database' as const,
  }));

  setCached(searchCache, `db:${normalized}`, results, SEARCH_CACHE_TTL_MS);
  return results;
}

async function searchProductsInCsv(message: string): Promise<ProductContext[]> {
  const normalized = normalizeQuery(message);
  const cached = getCached(searchCache, `csv:${normalized}`);
  if (cached) {
    return cached;
  }

  let files: string[] = [];
  try {
    files = (await fs.readdir(MEDICINE_DB_DIR))
      .filter((file) => file.toLowerCase().endsWith('.csv'))
      .slice(0, 10);
  } catch {
    return [];
  }

  const terms = extractSearchTerms(message);
  const categoryHint = inferCategoryHint(message);
  if (terms.length === 0 && !categoryHint) {
    return [];
  }

  const results: ProductContext[] = [];

  for (const file of files) {
    if (results.length >= MAX_CONTEXT_PRODUCTS) {
      break;
    }

    const filePath = path.join(MEDICINE_DB_DIR, file);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = Papa.parse<Record<string, string>>(raw, {
      header: true,
      skipEmptyLines: true,
    });

    for (const row of parsed.data) {
      if (results.length >= MAX_CONTEXT_PRODUCTS) {
        break;
      }

      const searchable = normalizeQuery(
        [row.name, row.category, row.generic_name, row.description, row.manufacturer].filter(Boolean).join(' ')
      );

      const matchesTerms = terms.some((term) => searchable.includes(term));
      const matchesCategoryHint = categoryHint ? searchable.includes(categoryHint) : false;
      if (!matchesTerms && !matchesCategoryHint) {
        continue;
      }

      results.push({
        id: 0,
        name: row.name?.trim() || 'Unknown medicine',
        slug: (row.slug || row.name || 'unknown').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: row.category?.trim() || null,
        genericName: row.generic_name?.trim() || null,
        description: row.description?.trim() || null,
        manufacturer: row.manufacturer?.trim() || null,
        form: row.form?.trim() || null,
        strength: row.strength?.trim() || null,
        price: toNumber(row.price),
        stock: Number.parseInt(String(row.stock ?? '0'), 10) || 0,
        requiresPrescription: toBoolean(row.requires_prescription),
        expiryDate: row.expiry_date?.trim() || null,
        source: 'csv',
      });
    }
  }

  setCached(searchCache, `csv:${normalized}`, results, SEARCH_CACHE_TTL_MS);
  return results;
}

async function retrieveRelevantMedicines(message: string, personalization: PersonalizationContext): Promise<RetrievalResult> {
  const dbMatches = await searchProductsInDatabase(message);
  const boostedDbMatches = [...dbMatches].sort((left, right) => {
    const leftBoost =
      (personalization.recentCategories.includes(left.category ?? '') ? 2 : 0) +
      (personalization.recentProducts.includes(left.name) ? 1 : 0);
    const rightBoost =
      (personalization.recentCategories.includes(right.category ?? '') ? 2 : 0) +
      (personalization.recentProducts.includes(right.name) ? 1 : 0);
    return rightBoost - leftBoost;
  });

  if (boostedDbMatches.length >= 2) {
    return {
      references: boostedDbMatches.slice(0, MAX_CONTEXT_PRODUCTS),
      contextSource: 'database',
      confidence: 'strong',
    };
  }

  if (boostedDbMatches.length === 1) {
    return {
      references: boostedDbMatches,
      contextSource: 'database',
      confidence: 'weak',
      fallbackReason: 'single-db-match',
    };
  }

  const csvMatches = await searchProductsInCsv(message);
  if (csvMatches.length > 0) {
    return {
      references: csvMatches.slice(0, MAX_CONTEXT_PRODUCTS),
      contextSource: 'csv',
      confidence: csvMatches.length >= 2 ? 'weak' : 'weak',
      fallbackReason: 'api-or-db-fallback-to-csv',
    };
  }

  return {
    references: [],
    contextSource: 'none',
    confidence: 'none',
    fallbackReason: 'no-matching-medicines',
  };
}

function buildSuggestions(references: ProductContext[]) {
  const base = ['Show vitamins', 'What cold medicines are available?', 'Which products need a prescription?'];
  const dynamic = references.slice(0, 2).map((product) => `Tell me about ${product.name}`);
  return Array.from(new Set([...dynamic, ...base])).slice(0, 4);
}

function buildFallbackAnswer(message: string, retrieval: RetrievalResult, personalization: PersonalizationContext): ChatResponse {
  if (retrieval.references.length === 0) {
    return {
      answer: `I couldn't find "${message}" in our medicine database. Could you tell me the specific medicine name or describe your symptoms? I'll help you find the right product.\n\nConsult a doctor for proper medical advice.`,
      disclaimer: SAFETY_DISCLAIMER,
      references: [],
      suggestions: buildSuggestions([]),
      personalizationUsed: personalization.recentCategories.length > 0 || personalization.recentProducts.length > 0,
      source: 'fallback-no-data',
    };
  }

  // Build product cards with prices
  const productCards = retrieval.references.slice(0, 5).map((product) => {
    const priceTag = `₹${product.price.toFixed(0)}`;
    const stockStatus = product.stock > 0 ? '✅ In stock' : '❌ Out of stock';
    const rxTag = product.requiresPrescription ? '📋 Rx required' : '';
    
    return `📦 **${product.name}** ${priceTag}\n   ${product.category ?? 'General'} • ${stockStatus} ${rxTag}`;
  });

  const personalizationLine =
    personalization.recentCategories.length > 0
      ? `\n💡 Based on your orders: ${personalization.recentCategories.join(', ')}`
      : '';

  return {
    answer: [
      'Here are some medicines that might help:',
      '',
      ...productCards,
      personalizationLine,
      '',
      'Consult a doctor for proper medical advice.',
    ]
      .filter(Boolean)
      .join('\n'),
    disclaimer: SAFETY_DISCLAIMER,
    references: retrieval.references,
    suggestions: buildSuggestions(retrieval.references),
    personalizationUsed: personalization.recentCategories.length > 0 || personalization.recentProducts.length > 0,
    source: retrieval.contextSource === 'csv' ? 'csv-fallback' : 'db-fallback',
  };
}

function buildControlledPrompt(input: {
  message: string;
  references: ProductContext[];
  personalization: PersonalizationContext;
  history: ChatHistoryItem[];
  language?: string;
}) {
  const referencesBlock =
    input.references.length > 0
      ? input.references.map((reference) => formatProductLine(reference)).join('\n')
      : '- No medicines found in the internal database.';

  const historyBlock =
    input.history.length > 0
      ? input.history.map((item) => `${item.role}: ${item.content}`).join('\n')
      : 'No prior chat history.';

  const userLanguage = input.language || 'en';

  return [
    NATURE_MED_COACH_SYSTEM_PROMPT,
    '',
    '---',
    '',
    `User language: ${userLanguage}`,
    '',
    `User query: ${input.message}`,
    '',
    'Recent chat history:',
    historyBlock,
    '',
    `Personalization recent categories: ${input.personalization.recentCategories.join(', ') || 'none'}`,
    `Personalization recent products: ${input.personalization.recentProducts.join(', ') || 'none'}`,
    '',
    'Internal medicine context (USE ONLY THESE MEDICINES):',
    referencesBlock,
    '',
    'IMPORTANT:',
    '- Only mention medicines listed above',
    '- Respond in the user\'s language',
    '- Never provide dosage instructions',
    '- Always include safety disclaimer',
    '- Return valid JSON only',
  ].join('\n');
}

function sanitizeJsonPayload(payload: unknown): ModelPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.summary !== 'string' || !Array.isArray(candidate.medicines) || typeof candidate.needsClarification !== 'boolean') {
    return null;
  }

  return {
    summary: candidate.summary.trim(),
    medicines: candidate.medicines.filter((item): item is string => typeof item === 'string').map((item) => item.trim()),
    needsClarification: candidate.needsClarification,
    clarifyingQuestion: typeof candidate.clarifyingQuestion === 'string' ? candidate.clarifyingQuestion.trim() : undefined,
  };
}

function parseModelPayload(rawContent: string): ModelPayload | null {
  const trimmed = rawContent.trim();
  const jsonText = trimmed.startsWith('{')
    ? trimmed
    : trimmed.includes('{') && trimmed.includes('}')
      ? trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1)
      : trimmed;

  try {
    return sanitizeJsonPayload(JSON.parse(jsonText));
  } catch {
    return null;
  }
}

function violatesSafetyRules(text: string) {
  const lower = normalizeQuery(text);
  const dosagePatterns = [
    /\b\d+\s?(mg|ml|tablet|tablets|capsule|capsules)\b/i,
    /\b(take|use|swallow|drink)\b/i,
    /\b(twice a day|once a day|daily|every \d+ hours)\b/i,
  ];

  if (dosagePatterns.some((pattern) => pattern.test(text))) {
    return true;
  }

  return ['prescribe', 'start taking', 'you should take'].some((term) => lower.includes(term));
}

function validateModelPayload(payload: ModelPayload, references: ProductContext[]) {
  const allowedNames = new Set(references.map((reference) => reference.name.toLowerCase()));
  const invalidNames = payload.medicines.filter((name) => !allowedNames.has(name.toLowerCase()));

  if (invalidNames.length > 0) {
    return {
      valid: false,
      reason: `unknown-medicines:${invalidNames.join(',')}`,
    };
  }

  if (violatesSafetyRules(payload.summary) || (payload.clarifyingQuestion && violatesSafetyRules(payload.clarifyingQuestion))) {
    return {
      valid: false,
      reason: 'safety-rule-violation',
    };
  }

  return {
    valid: true,
  };
}

async function generateModelPayload(input: {
  message: string;
  references: ProductContext[];
  personalization: PersonalizationContext;
  history: ChatHistoryItem[];
  language?: string;
}): Promise<ModelPayload | null> {
  if (!env.SCITELY_API_KEY || input.references.length === 0) {
    return null;
  }

  const response = await fetch(`${env.SCITELY_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SCITELY_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.SCITELY_MODEL,
      temperature: 0.1,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: buildControlledPrompt(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI provider request failed with status ${response.status}`);
  }

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  return content ? parseModelPayload(content) : null;
}

function buildValidatedAnswer(payload: ModelPayload, references: ProductContext[], personalization: PersonalizationContext): ChatResponse {
  const selectedReferences = references.filter((reference) =>
    payload.medicines.some((name) => name.toLowerCase() === reference.name.toLowerCase())
  );

  const medicineSummary =
    selectedReferences.length > 0
      ? `Relevant medicines from the internal database: ${selectedReferences.map((reference) => reference.name).join(', ')}.`
      : null;

  const personalizationLine =
    personalization.recentCategories.length > 0
      ? `Recent order preferences may be relevant: ${personalization.recentCategories.join(', ')}.`
      : null;

  const answer = payload.needsClarification
    ? `${payload.clarifyingQuestion || 'I need a bit more detail to help safely.'}\n\nConsult a doctor for medical advice.`
    : [payload.summary, medicineSummary, personalizationLine, 'Consult a doctor for medical advice.']
        .filter(Boolean)
        .join('\n\n');

  return {
    answer,
    disclaimer: SAFETY_DISCLAIMER,
    references: selectedReferences.length > 0 ? selectedReferences : references.slice(0, 3),
    suggestions: buildSuggestions(references),
    personalizationUsed: personalization.recentCategories.length > 0 || personalization.recentProducts.length > 0,
    source: payload.needsClarification ? 'clarification' : 'model-generated',
  };
}

export async function chatWithNatureMedCoach(
  message: string,
  context: ChatRequestContext,
  language?: string
): Promise<ChatResponse> {
  const startedAt = Date.now();
  const normalizedQuery = normalizeQuery(message);
  const cacheKey = createCacheKey(context, normalizedQuery);
  const cached = getCached(responseCache, cacheKey);

  // Language detection with priority: request > session memory > instruction > unicode > default
  const sessionLang = getSessionLanguage(context.sessionKey);
  const detectedLanguage = detectLanguage(message);
  
  // Priority order for language
  let userLanguage = language || sessionLang || detectedLanguage || 'en';
  
  // If language was explicitly requested or detected, save to session memory
  if (detectedLanguage && detectedLanguage !== 'en') {
    setSessionLanguage(context.sessionKey, detectedLanguage);
    userLanguage = detectedLanguage;
  } else if (language) {
    setSessionLanguage(context.sessionKey, language);
  }

  // Check if this is a general query (language request, greeting, etc.)
  const queryType = classifyQuery(message);

  if (queryType === 'general') {
    // For general queries, skip DB search and call AI directly
    const history = await getRecentChatHistory(context);
    const directResponse = await generateGeneralResponse({
      message,
      history,
      language: userLanguage,
    });

    if (directResponse) {
      // Apply safety filter
      const filteredResponse = applySafetyFilter(directResponse);

      const response: ChatResponse = {
        answer: filteredResponse,
        disclaimer: '', // No disclaimer for general chat
        references: [],
        suggestions: buildSuggestions([]),
        personalizationUsed: false,
        source: 'model-generated',
      };

      await persistChatMessage(context, 'user', message, { normalizedQuery, queryType: 'general', detectedLanguage, sessionLanguage: userLanguage });
      await persistChatMessage(context, 'assistant', response.answer, { source: response.source });
      await writeAiLog({
        context,
        query: message,
        normalizedQuery,
        retrieval: {
          references: [],
          contextSource: 'none',
          confidence: 'none',
        },
        response,
        responseTimeMs: Date.now() - startedAt,
        safetyStatus: 'passed',
        fallbackReason: 'general-query-direct-response',
        metadata: { queryType: 'general', detectedLanguage, sessionLanguage: userLanguage },
      });

      setCached(responseCache, cacheKey, response, RESPONSE_CACHE_TTL_MS);
      return response;
    }
    // If direct response fails, fall through to normal flow
  }

  if (cached) {
    await writeAiLog({
      context,
      query: message,
      normalizedQuery,
      retrieval: {
        references: cached.references,
        contextSource: cached.references.length > 0 ? (cached.references.every((ref) => ref.source === 'database') ? 'database' : 'csv') : 'none',
        confidence: cached.references.length > 0 ? 'strong' : 'none',
      },
      response: {
        ...cached,
        source: 'cache',
      },
      responseTimeMs: Date.now() - startedAt,
      safetyStatus: 'passed',
      metadata: { cacheHit: true },
    });
    return {
      ...cached,
      source: 'cache',
    };
  }

  const personalization = await getPersonalizationContext(context.user);
  const history = await getRecentChatHistory(context);
  const retrieval = await retrieveRelevantMedicines(message, personalization);

  await persistChatMessage(context, 'user', message, { normalizedQuery });

  if (needsClarification(message, retrieval)) {
    const response: ChatResponse = {
      answer: clarificationQuestion(message),
      disclaimer: SAFETY_DISCLAIMER,
      references: retrieval.references,
      suggestions: buildSuggestions(retrieval.references),
      personalizationUsed: personalization.recentCategories.length > 0 || personalization.recentProducts.length > 0,
      source: 'clarification',
    };
    await persistChatMessage(context, 'assistant', response.answer, { source: response.source });
    await writeAiLog({
      context,
      query: message,
      normalizedQuery,
      retrieval,
      response,
      responseTimeMs: Date.now() - startedAt,
      safetyStatus: 'passed',
      fallbackReason: 'weak-database-context',
    });
    return response;
  }

  if (retrieval.references.length === 0) {
    const response = buildFallbackAnswer(message, retrieval, personalization);
    await persistChatMessage(context, 'assistant', response.answer, { source: response.source });
    await writeAiLog({
      context,
      query: message,
      normalizedQuery,
      retrieval,
      response,
      responseTimeMs: Date.now() - startedAt,
      safetyStatus: 'passed',
      fallbackReason: retrieval.fallbackReason,
    });
    setCached(responseCache, cacheKey, response, RESPONSE_CACHE_TTL_MS);
    return response;
  }

  let safetyStatus: 'passed' | 'corrected' | 'rejected' = 'passed';
  let fallbackReason: string | undefined;
  let response: ChatResponse;

  try {
    const modelPayload = await generateModelPayload({
      message,
      references: retrieval.references,
      personalization,
      history,
      language: userLanguage,
    });

    if (!modelPayload) {
      fallbackReason = 'model-unavailable';
      response = buildFallbackAnswer(message, retrieval, personalization);
    } else {
      const validation = validateModelPayload(modelPayload, retrieval.references);
      if (!validation.valid) {
        safetyStatus = 'rejected';
        fallbackReason = validation.reason;
        response = buildFallbackAnswer(message, retrieval, personalization);
      } else if (looksDangerous(message)) {
        safetyStatus = 'corrected';
        fallbackReason = 'dangerous-query-fallback';
        response = buildFallbackAnswer(message, retrieval, personalization);
      } else {
        response = buildValidatedAnswer(modelPayload, retrieval.references, personalization);
      }
    }
  } catch (error) {
    fallbackReason = error instanceof Error ? error.message : 'model-error';
    response = buildFallbackAnswer(message, retrieval, personalization);
  }

  const finalResponse = response.answer.includes('Consult a doctor for medical advice.')
    ? response
    : {
        ...response,
        answer: `${response.answer}\n\nConsult a doctor for medical advice.`,
      };

  await persistChatMessage(context, 'assistant', finalResponse.answer, {
    source: finalResponse.source,
    contextSource: retrieval.contextSource,
  });

  await writeAiLog({
    context,
    query: message,
    normalizedQuery,
    retrieval,
    response: finalResponse,
    responseTimeMs: Date.now() - startedAt,
    safetyStatus,
    fallbackReason,
    metadata: {
      historyMessages: history.length,
      personalizationUsed: finalResponse.personalizationUsed,
    },
  });

  setCached(responseCache, cacheKey, finalResponse, RESPONSE_CACHE_TTL_MS);
  return finalResponse;
}

export function buildAiSessionKey(user: UserContext, rawSessionSeed: string) {
  return getSessionKeyFromRequest(user, rawSessionSeed);
}
