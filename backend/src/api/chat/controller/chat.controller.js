import 'dotenv/config';
import { createConversationService, getRecentConversationRows } from "../service/chat.service.js";

export async function createConversationsController(req, res) {
  try {
    const { question } = req.body;
    
    // validation
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question is required',
      });
    }
    
    const result = await createConversationService(question);
    
    res.status(201).json({  // Changed from 281 to 201 (Created)
      success: true,
      message: 'Conversation posted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in createConversationsController:', error);
    
    // Handle specific error status if present
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create conversation',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

export async function getConversationsController(req, res) {
  try {
    // Get limit from query parameter (default: 5)
    const limit = parseInt(req.query.limit) || 100;
    
    // Fetch recent conversations
    const result = await getRecentConversationRows(limit);
    
    res.status(200).json({
      success: true,
      message: 'Conversations fetched successfully',
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error('Error in getConversationsController:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message,
    });
  }
}