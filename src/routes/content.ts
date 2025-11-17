import { Router, Request, Response } from "express";
import { readFileSync } from 'fs';
import { join } from 'path';
import { authMiddleware as auth } from "../middleware/auth";
import { catchAsync } from "../middleware/errorHandler";

// Dynamically load content from JSON file
const getContentData = () => {
  try {
    const contentPath = join(__dirname, '../data/content.json');
    const content = JSON.parse(readFileSync(contentPath, 'utf-8'));
    return content;
  } catch (error) {
    console.error('Error reading content.json:', error);
    // Fallback empty content
    return { phases: [] };
  }
};

const router = Router();

// GET /api/content - Return all content data
router.get('/', auth, catchAsync(async (req: Request, res: Response) => {
  const CONTENT_DATA = getContentData();
  res.json({ content: CONTENT_DATA });
}));

export default router;
