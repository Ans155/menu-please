import { createWorker } from 'tesseract.js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { type ServiceError } from './types';
import logger from '../utils/logger';
import { config } from '../../config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import {
    GoogleGenAI,
    createUserContent,
    createPartFromUri,
} from '@google/genai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import vision from '@google-cloud/vision';

// Define model options similar to ChatService
const LLM_MODELS = {
    GPT4: 'gpt-4',
    GPT35_TURBO: 'gpt-3.5-turbo',
    GEMINI_PRO: 'gemini-2.0-flash',
    GEMINI_VISION: 'gemini-vision',
    // Add more models as needed
};

// Model configuration type
export type MenuModelConfig = {
    llmModel: string;
    temperature?: number;
    googleApiKey?: string;
    openAIKey?: string;
};

// Define types for menu items
export interface MenuItem {
    _id?: string;
    text: string;
    dish_name: string;
    category: string;
    subcategory: string;
    description: string;
    price_inr: string;
    rating: string;
    calories: string;
    image_url: string;
    chunk_number: number;
    keywords: string[];
}

export class MenuService {
    private openai: OpenAI;
    private llmModel: string;
    private temperature: number;
    private googleApiKey?: string;
    private openAIKey?: string;
    private visionClient: ImageAnnotatorClient;

    constructor(modelConfig?: MenuModelConfig) {
        this.llmModel = modelConfig?.llmModel || LLM_MODELS.GEMINI_PRO;
        this.temperature = modelConfig?.temperature || 0.2;
        this.googleApiKey = modelConfig?.googleApiKey || config.geminiAI.key;
        this.openAIKey = modelConfig?.openAIKey || config.openAI.key;

        // Initialize OpenAI with API key from config
        this.openai = new OpenAI({
            apiKey: this.openAIKey,
        });

        // Initialize Google Vision client
        this.visionClient = new vision.ImageAnnotatorClient({
            keyFilename: path.join(process.cwd(), 'google-vision-key.json'),
        });
    }

    /**
     * Create an instance of the appropriate LLM model based on configuration
     */
    private async createLLM() {
        logger.info('CREATING_LLM', {
            model: this.llmModel,
            temperature: this.temperature,
        });

        // if (this.llmModel === LLM_MODELS.GEMINI_PRO) {
            if (!this.googleApiKey) {
                logger.error('GOOGLE_API_KEY_MISSING');
                throw new Error(
                    'Google API key is required for Gemini Pro model',
                );
            }
            logger.info('USING_GOOGLE_GENERATIVE_AI');
            return new ChatGoogleGenerativeAI({
                modelName: this.llmModel,
                temperature: this.temperature,
                apiKey: this.googleApiKey,
            });
        // }
        // } else if (this.llmModel === LLM_MODELS.GEMINI_VISION) {
        //     if (!this.googleApiKey) {
        //         logger.error('GOOGLE_API_KEY_MISSING');
        //         throw new Error(
        //             'Google API key is required for Gemini Vision model',
        //         );
        //     }
        //     logger.info('USING_GOOGLE_GENAI_VISION');
        //     return new GoogleGenAI({
        //         apiKey: this.googleApiKey,
        //     });
        // } else {
        //     logger.info('USING_OPENAI_MODEL');
        //     return new ChatOpenAI({
        //         modelName: this.llmModel,
        //         temperature: this.temperature,
        //     });
        // }
    }

    /**
     * Process an uploaded menu image through OCR and structure the data
     * @param filePath - Path to the uploaded image
     * @returns Structured menu data or error
     */
    async processMenuImage(
        filePath: string,
    ): Promise<MenuItem[] | ServiceError> {
        try {
            logger.info('PROCESSING_MENU_IMAGE', {
                filePath,
                model: this.llmModel,
            });

            // if (this.llmModel === LLM_MODELS.GEMINI_VISION) {
            //     return await this.processMenuWithGeminiVision(filePath);
            // } else {
                return await this.processMenuWithOCRAndLLM(filePath);
            // }
        } catch (error) {
            logger.error('MENU_PROCESSING_ERROR', { error });
            return { message: 'MENU_PROCESSING_ERROR', code: 500 };
        }
    }

    /**
     * Process menu using OCR and then LLM
     * @param filePath - Path to the menu image
     * @returns Structured menu data or error
     */
    private async processMenuWithOCRAndLLM(
        filePath: string,
    ): Promise<MenuItem[] | ServiceError> {
        try {
            // Step 1: Extract text using Tesseract OCR or Google Vision
            const extractedText = await this.extractTextFromImage(filePath);
            if (!extractedText) {
                logger.error('OCR_EXTRACTION_FAILED', { filePath });
                return { message: 'OCR_EXTRACTION_FAILED', code: 500 };
            }
            console.log('EXTRACTED_TEXT:', extractedText);
            logger.info('OCR_EXTRACTION_COMPLETED', {
                textLength: extractedText.length,
            });

            // Step 2: Process extracted text with LLM to get structured data
            const structuredData = await this.processWithLLM(extractedText);
            console.log(
                'STRUCTURED_DATA:',
                JSON.stringify(structuredData, null, 2),
            );

            // Clean up temporary file if needed
            this.cleanupTempFile(filePath);

            return structuredData;
        } catch (error) {
            logger.error('OCR_LLM_PROCESSING_ERROR', { error });
            return { message: 'OCR_LLM_PROCESSING_ERROR', code: 500 };
        }
    }

    /**
     * Process menu directly using Gemini Vision capabilities
     * @param filePath - Path to the menu image
     * @returns Structured menu data or error
     */
    // private async processMenuWithGeminiVision(
    //     filePath: string,
    // ): Promise<MenuItem[] | ServiceError> {
    //     try {
    //         logger.info('PROCESSING_WITH_GEMINI_VISION', { filePath });

    //         if (!this.googleApiKey) {
    //             logger.error('GOOGLE_API_KEY_MISSING');
    //             return { message: 'GOOGLE_API_KEY_MISSING', code: 500 };
    //         }

    //         // Initialize the Google GenAI client for Gemini
    //         const genAI = new GoogleGenAI({ apiKey: this.googleApiKey });
    //         const model = genAI.generativeModel({
    //             model: 'gemini-pro-vision',
    //         });

    //         // Create image part from file
    //         const imagePart = await createPartFromUri(`file://${filePath}`);

    //         // Create prompt for structured extraction
    //         const prompt = `
    //             Extract structured menu items from this restaurant menu image. 
    //             Format each dish as a JSON object with the following structure:
                
    //             {
    //               "text": "Original text extracted from the menu",
    //               "dish_name": "Name of the dish",
    //               "category": "Main category (e.g., Starters, Main Course, Desserts)",
    //               "subcategory": "Subcategory (e.g., Vegetarian, Non-Vegetarian, Vegan)",
    //               "description": "Full description of the dish",
    //               "price_inr": "Price in Indian Rupees (numbers only)",
    //               "rating": "Rating if available (e.g., 4.5)",
    //               "calories": "Caloric information if available (e.g., 250)",
    //               "image_url": "A placeholder URL or empty string",
    //               "chunk_number": 1, // Sequential number for each menu item
    //               "keywords": ["keyword1", "keyword2"] // Relevant keywords for search
    //             }
                
    //             Return the results as a JSON array. For fields where information is not available in the image, use reasonable defaults or empty strings.
    //         `;

    //         // Send request to Gemini Vision
    //         const result = await model.generateContent([prompt, imagePart]);
    //         const response = await result.response;
    //         const text = response.text();

    //         logger.info('GEMINI_VISION_RESPONSE_RECEIVED', {
    //             responseLength: text.length,
    //         });

    //         // Parse the response into structured data
    //         const structuredData = this.parseModelResponse(text);

    //         // Clean up temporary file if needed
    //         this.cleanupTempFile(filePath);

    //         return structuredData;
    //     } catch (error) {
    //         logger.error('GEMINI_VISION_PROCESSING_ERROR', { error });
    //         return { message: 'GEMINI_VISION_PROCESSING_ERROR', code: 500 };
    //     }
    // }

    /**
     * Extract text from an image using Google Cloud Vision
     * @param imagePath - Path to the image file
     * @returns Extracted text from the image
     */
    private async extractTextFromImage(
        imagePath: string,
    ): Promise<string | null> {
        try {
            logger.info('STARTING_TEXT_EXTRACTION', { method: 'google-vision' });

            const [result] = await this.visionClient.textDetection(imagePath);
            const detections = result.textAnnotations;

            if (!detections || detections.length === 0) {
                logger.warn('NO_TEXT_DETECTED_IN_IMAGE');
                return '';
            }

            const extractedText = detections[0].description || '';
            logger.info('TEXT_EXTRACTION_COMPLETED', {
                textLength: extractedText.length,
            });

            return extractedText;
        } catch (error) {
            // Fall back to Tesseract if Google Vision fails
            logger.warn('GOOGLE_VISION_FAILED_FALLING_BACK_TO_TESSERACT', {
                error,
            });
            return this.performOCR(imagePath);
        }
    }

    /**
     * Perform OCR using Tesseract.js
     * @param imagePath - Path to the image file
     * @returns Extracted text from the image
     */
    private async performOCR(imagePath: string): Promise<string | null> {
        try {
            logger.info('STARTING_OCR_PROCESS');
            const worker = await createWorker('eng');

            const {
                data: { text },
            } = await worker.recognize(imagePath);
            await worker.terminate();

            logger.info('OCR_COMPLETED_SUCCESSFULLY');
            return text;
        } catch (error) {
            logger.error('OCR_PROCESS_ERROR', { error });
            return null;
        }
    }

    /**
     * Process extracted text using the selected LLM
     * @param text - Raw text extracted from the menu image
     * @returns Structured menu data
     */
    private async processWithLLM(text: string): Promise<MenuItem[]> {
        try {
            logger.info('PROCESSING_TEXT_WITH_LLM', {
                model: this.llmModel,
                textLength: text.length,
            });

            // For both models, create a consistent prompt
            const prompt = `
        Extract structured menu items from the following restaurant menu text. 
        Format each dish as a JSON object with the following structure:
        
        {
          "dish_name": "Name of the dish",
          "category": "Main category (e.g., Starters, Main Course, Desserts, Combo)",
          "subcategory": "Subcategory (e.g., Vegetarian, Non-Vegetarian, Vegan)",
          "description": "Full description of the dish, explain what the dish is, this is a mandatory field",
          "price_inr": "Price in Indian Rupees (numbers only)",
          "rating": "Rating if available (e.g., 4.5)",
          "calories": "Caloric information if available (e.g., 250)",
          "image_url": "A placeholder URL or empty string",
          "keywords": ["keyword1", "keyword2"] // Relevant keywords for search
        }
        
        Return the results as a JSON array. For fields where information is not available in the text, use reasonable defaults or empty strings.
        
        Here's the menu text:
        ${text}
      `;

            // Get LLM instance based on configuration
            const llm = await this.createLLM();

            // Process with LangChain models consistently
            logger.info('INVOKING_LLM', { model: this.llmModel });
            const response = await llm.invoke(prompt);
            console.log('LLM_RESPONSE:', response);
            console.log('PROMPT ', prompt);
            return this.parseModelResponse(response?.content as string);
        } catch (error) {
            logger.error('LLM_PROCESSING_ERROR', { error });
            return [];
        }
    }

    /**
     * Parse the LLM model response to extract structured menu data
     * @param response - Raw text response from the LLM
     * @returns Array of structured menu items
     */
    private parseModelResponse(response: string): MenuItem[] {
        logger.info('PARSING_MODEL_RESPONSE');
        try {
            // First check if the response is already a valid JSON array
            if (
                response.trim().startsWith('[') &&
                response.trim().endsWith(']')
            ) {
                try {
                    return this.processMenuItems(JSON.parse(response.trim()));
                } catch (e) {
                    logger.warn('RESPONSE_LOOKS_LIKE_JSON_ARRAY_BUT_INVALID', {
                        error: e,
                    });
                }
            }

            // Extract JSON from code blocks or direct JSON response
            const jsonCodeBlockRegex = /```(?:json)?\n([\s\S]*?)\n```/;
            const match = response.match(jsonCodeBlockRegex);

            let parsedResponse: any = null;

            if (match && match[1]) {
                // Extract the JSON content from the code block
                const jsonContent = match[1].trim();

                try {
                    // Parse the JSON to ensure it's valid
                    parsedResponse = JSON.parse(jsonContent);
                } catch (e) {
                    logger.warn('CODE_BLOCK_CONTAINS_INVALID_JSON', {
                        error: e,
                    });
                    return [];
                }
            } else if (
                response.trim().startsWith('{') &&
                response.trim().endsWith('}')
            ) {
                try {
                    // If direct JSON, validate by parsing
                    parsedResponse = JSON.parse(response.trim());
                } catch (e) {
                    logger.warn('RESPONSE_LOOKS_LIKE_JSON_BUT_INVALID', {
                        error: e,
                    });
                    return [];
                }
            } else {
                // Not JSON, return empty array
                logger.warn('RESPONSE_NOT_IN_JSON_FORMAT');
                return [];
            }

            // The response might have a nested structure, so we check common patterns
            const menuItems = Array.isArray(parsedResponse)
                ? parsedResponse
                : parsedResponse.menuItems ||
                  parsedResponse.items ||
                  parsedResponse.data ||
                  [];

            if (Array.isArray(menuItems)) {
                logger.info('SUCCESSFULLY_PARSED_MENU_ITEMS', {
                    count: menuItems.length,
                });
                return this.processMenuItems(menuItems);
            } else {
                logger.error('UNEXPECTED_RESPONSE_FORMAT', { parsedResponse });
                return [];
            }
        } catch (error) {
            logger.error('ERROR_PARSING_MODEL_RESPONSE', { error });
            return [];
        }
    }

    // Helper method to add text field to each menu item
    private processMenuItems(menuItems: MenuItem[]): MenuItem[] {
        return menuItems.map((item, index) => ({
            ...item,
            text: `${item.dish_name}: ${item.description}, ${item.category}, ${item.subcategory}, at ${item.price_inr}`,
        }));
    }

    private cleanupTempFile(filePath: string): void {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info('TEMP_FILE_CLEANED_UP', { filePath });
            }
        } catch (error) {
            logger.error('TEMP_FILE_CLEANUP_ERROR', { error, filePath });
        }
    }
}
