import db from '../../../../db/db.config.js';
import { GoogleGenAI } from '@google/genai';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getRecentConversationRows = async (limit = 5) => {
  const normalizedLimit = Number.parseInt(limit, 10);

  const safeLimit =
    Number.isNaN(normalizedLimit) || normalizedLimit <= 0
      ? 20
      : normalizedLimit;

  const [rows] = await db.execute(
    `SELECT id, role, content, created_at
     FROM conversations
     ORDER BY id DESC
     LIMIT ${safeLimit}`
  );

  return rows.reverse();
};

const generateAssistantAnswer = async ({ historyRows, question }) => {
  // Format history for Gemini - THIS WAS MISSING
  const formattedHistory = historyRows.map(row => ({
    role: row.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: row.content }],
  }));

  const chat = geminiClient.chats.create({
    model: GEMINI_MODEL,
    history: formattedHistory,  // Now formattedHistory is defined
    config: {
      maxOutputTokens: 8194,
    }
  });

  const result = await chat.sendMessage({
    message: question,
  });
  
  return {
    text: result.text,
    totalTokens: result.usageMetadata.totalTokenCount,
  };
};

const getMessageById = async (messageId) => {
  if (!messageId) return null;
  
  const [rows] = await db.execute(
    'SELECT id, role, content, token_count, created_at FROM conversations WHERE id = ? LIMIT 1',
    [messageId],
  );
  
  if (!rows[0]) {
    return null;
  }
  
  return {
    id: rows[0].id,
    role: rows[0].role,
    content: rows[0].content,
    tokenCount: Number(rows[0].token_count || 0),
    createdAt: rows[0].created_at,
  };
};

export async function createConversationService(question) {
  try {
    // validation
    if (!question || !question.trim()) {
      const error = new Error('Question is required');
      error.status = 400;
      throw error;
    }

    // Insert user question
    const [userResult] = await db.execute(
      'INSERT INTO conversations (content, role) VALUES (?, "user")',
      [question]
    );

    // Get recent conversations (including the one we just inserted)
    const historyRows = await getRecentConversationRows(5);

    // Generate AI response using history
    const { text, totalTokens } = await generateAssistantAnswer({
      historyRows,
      question,
    });

    // Save AI response
    const [assistantResult] = await db.execute(
      'INSERT INTO conversations (role, content, token_count) VALUES (?, ?, ?)',
      ['assistant', text, totalTokens]
    );

    // Get both messages by their IDs
    const userConversation = await getMessageById(userResult.insertId);
    const assistantConversation = await getMessageById(assistantResult.insertId);

    // Return both user and assistant messages
    return {
      userConversation,
      assistantConversation,
    };
  } catch (error) {
    console.error('Error in createConversationService:', error);
    throw error;
  }
}