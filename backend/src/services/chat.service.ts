import { ChatOpenAI } from '@langchain/openai';
// Remove PromptTemplate import
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { MessageContent, ServiceError } from './types';
import Database from '../db/mongo';
import { config } from '../../config';
import * as fs from 'fs';
import * as path from 'path';
import { Document } from '@langchain/core/documents';
import { ConversationService } from './conversation.service';
import logger from '../utils/logger';

const PROMPT_TEMPLATE_PATH = path.resolve(
    __dirname,
    '../../resources/prompt.txt',
);

// Model options
const LLM_MODELS = {
    GPT4_MINI: 'gpt-4o-mini',
    GPT4: 'gpt-4',
    GPT35_TURBO: 'gpt-3.5-turbo',
    GEMINI_PRO: 'gemini-2.0-flash',
    // Add more models as needed
};

const EMBEDDING_MODELS = {
    OPENAI_SMALL: 'text-embedding-3-small',
    OPENAI_LARGE: 'text-embedding-3-large',
    HF_BGE_SMALL: 'hf-bge-small',
    // Add more models as needed
};

const namespace = config.database.mongo.namespace as string;
const [dbName, collectionName] = namespace.split('.');
const indexName = config.database.mongo.indexName;

// Model configuration types
type ModelConfig = {
    llmModel: string;
    embeddingModel: string;
    temperature?: number;
    googleApiKey?: string;
};

// Helper function to format documents as string (since the import is problematic)
function formatDocuments(documents: Document[]): string {
    return documents.map((doc) => doc.pageContent).join('\n\n');
}

/**
 * Native prompt template handler to replace LangChain's PromptTemplate
 */
class NativePromptTemplate {
    private templateString: string;
    public inputVariables: string[];
    
    constructor(templateString: string) {
        this.templateString = templateString;
        // Extract input variables from the template by finding patterns like {variable_name}
        const matches = templateString.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
        // Remove duplicates and extract variable names
        this.inputVariables = [...new Set(matches)].map(match => match.substring(1, match.length - 1));
    }

    /**
     * Format the template with the given values
     */
    async format(values: Record<string, any>): Promise<string> {
        let result = this.templateString;
        
        // Simple string replacement for each variable
        for (const key of Object.keys(values)) {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            result = result.replace(regex, values[key]);
        }
        
        return result;
    }
}

class ChatService {
    private llmModel: string;
    private embeddingModel: string;
    private temperature: number;
    private googleApiKey?: string;
    private lastRetrievedDocuments: Document[] = []; // Add property to store the last retrieved documents

    constructor(modelConfig?: ModelConfig) {
        this.llmModel = modelConfig?.llmModel || LLM_MODELS.GEMINI_PRO;
        this.embeddingModel =
            modelConfig?.embeddingModel || EMBEDDING_MODELS.HF_BGE_SMALL;
        this.temperature = modelConfig?.temperature || 0;
        this.googleApiKey =
            modelConfig?.googleApiKey || process.env.GOOGLE_API_KEY;
    }

    private static createPrompt(): NativePromptTemplate {
        const prompt_template = fs.readFileSync(PROMPT_TEMPLATE_PATH, 'utf8');
        // Create our native prompt template instead of using LangChain
        const prompt = new NativePromptTemplate(prompt_template);
        logger.info('PROMPT_TEMPLATE_CREATED', {
            inputVariables: prompt.inputVariables,
        });
        return prompt;
    }

    private async createLLM() {
        logger.info('CREATING_LLM', {
            model: this.llmModel,
            temperature: this.temperature,
        });
        if (this.llmModel === LLM_MODELS.GEMINI_PRO) {
            if (!this.googleApiKey) {
                logger.error('GOOGLE_API_KEY_MISSING');
                throw new Error(
                    'Google API key is required for Gemini Pro model',
                );
            }
            logger.info('USING_GOOGLE_GENERATIVE_AI');
            return new ChatGoogleGenerativeAI({
                modelName: LLM_MODELS.GEMINI_PRO,
                temperature: this.temperature,
                apiKey: this.googleApiKey,
            });
        } else {
            logger.info('USING_OPENAI_MODEL');
            return new ChatOpenAI({
                modelName: this.llmModel,
                temperature: this.temperature,
            });
        }
    }

    private async createEmbeddings() {
        logger.info('CREATING_EMBEDDINGS', { model: this.embeddingModel });
        try {
            if (this.embeddingModel === EMBEDDING_MODELS.HF_BGE_SMALL) {
                logger.info('USING_HUGGINGFACE_EMBEDDINGS');
                return new HuggingFaceInferenceEmbeddings({
                    model: 'BAAI/bge-small-en-v1.5',
                    apiKey: process.env.HUGGINGFACE_API_KEY,
                });
            } else {
                logger.info('USING_OPENAI_EMBEDDINGS');
                return new OpenAIEmbeddings({ modelName: this.embeddingModel });
            }
        } catch (error) {
            logger.error('ERROR_CREATING_EMBEDDINGS', { error });
            throw new Error('Failed to create embeddings model');
        }
    }

    private async createRetriever(): Promise<any | ServiceError> {
        logger.info('CREATING_VECTOR_STORE_RETRIEVER');
        try {
            logger.info('INITIALIZING_EMBEDDINGS_MODEL');
            const embeddings = await this.createEmbeddings();

            logger.info('CONNECTING_TO_MONGODB_ATLAS');
            const client = await Database.getInstance();
            const collection = client.db(dbName).collection(collectionName);

            logger.info('CREATING_VECTOR_STORE', { indexName });
            const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
                collection,
                indexName,
                textKey: 'text',
                embeddingKey: 'embedding',
            });

            logger.info('VECTOR_STORE_CREATED_SUCCESSFULLY');
            // Using any type to bypass the type checking issues
            return vectorStore.asRetriever(6);
        } catch (error) {
            logger.error('ERROR_CREATING_RETRIEVER', { error });
            return {
                code: 500,
                message: 'ERROR_CREATING_RETRIEVER',
            } as ServiceError;
        }
    }

    private async getConversationalChain(
        retriever: any,
        messages: any,
    ): Promise<any | ServiceError> {
        try {
            logger.info('CREATING_CONVERSATIONAL_CHAIN');
            const prompt = ChatService.createPrompt();
            const llm = await this.createLLM();

            // Create a custom pipeline to avoid typing issues
            const retrievalChain = async (query: string) => {
                try {
                    logger.info('PROCESSING_QUERY', { query });

                    // New Step: Query rewriting with conversation context
                    logger.info('REWRITING_QUERY_WITH_CONTEXT');
                    let rewrittenQuery = query;
                    if (messages && messages.trim() !== '') {
                        try {
                            // Use our native prompt template for query rewriting
                            const queryRewriteTemplate = 
                                'Given the conversation history and a new question, analyze if the question is related to the history:\n\n' +
                                '- If the question is related to the conversation history, rewrite it to be more specific including relevant context.\n' +
                                '- If the question seems unrelated to the history or introduces a new topic, return the original question with minimal changes.\n\n' +
                                'Conversation History:\n{history}\n\n' +
                                'Original Question: {question}\n\n' +
                                'Rewritten Question:';
                            
                            const queryRewritePrompt = new NativePromptTemplate(queryRewriteTemplate);

                            const queryRewriteResult =
                                await queryRewritePrompt.format({
                                    history: messages,
                                    question: query,
                                });

                            logger.info('INVOKING_LLM_FOR_QUERY_REWRITE');
                            const rewriteResponse =
                                await llm.invoke(queryRewriteResult);
                            rewrittenQuery = rewriteResponse.content
                                .toString()
                                .trim();
                            logger.info('QUERY_REWRITTEN', {
                                originalQuery: query,
                                rewrittenQuery,
                            });
                        } catch (error) {
                            // If query rewriting fails, fall back to original query
                            logger.error('QUERY_REWRITE_ERROR', { error });
                            logger.info('FALLING_BACK_TO_ORIGINAL_QUERY');
                        }
                    } else {
                        logger.info(
                            'NO_CONVERSATION_HISTORY_AVAILABLE_FOR_REWRITING',
                        );
                    }

                    // Retrieve documents using the rewritten query
                    logger.info('RETRIEVING_DOCUMENTS', { rewrittenQuery });
                    const docs =
                        await retriever.getRelevantDocuments(rewrittenQuery);
                    logger.info('DOCUMENTS_RETRIEVED', { count: docs.length });
                    
                    // Store retrieved documents for post-processing
                    this.lastRetrievedDocuments = docs;
                    
                    // Log document metadata for debugging
                    const documentMetadata = docs.map((doc: Document) => {
                        return {
                            dish_name: doc.metadata?.dish_name,
                            image_url: doc.metadata?.image_url
                        };
                    });
                    logger.info('RETRIEVED_DOCUMENT_METADATA', { documentMetadata });
                    
                    const formattedDocs = formatDocuments(docs);
                    logger.info('DOCUMENTS_FORMATTED_SUCCESSFULLY');

                    // Only include history if it's present in the prompt template's input variables
                    const promptInputs: Record<string, any> = {
                        context: formattedDocs,
                        question: query,
                        history: messages,
                    };

                    // Check if history is required by the prompt template
                    if (prompt.inputVariables.includes('history')) {
                        promptInputs.history = messages || '';
                    }

                    const result = await prompt.format(promptInputs);

                    logger.info('INVOKING_LLM');
                    const response = await llm.invoke(result);
                    logger.info('LLM_RESPONSE_RECEIVED');
                    console.log('LLM_RESPONSE', { response });
                    return response.content;
                } catch (error) {
                    logger.error('ERROR_IN_RETRIEVAL_CHAIN', { error });
                    throw error;
                }
            };

            logger.info('CONVERSATIONAL_CHAIN_CREATED_SUCCESSFULLY');
            return retrievalChain;
        } catch (error) {
            logger.error('ERROR_CREATING_CONVERSATIONAL_CHAIN', { error });
            return {
                code: 500,
                message: 'ERROR_CREATING_CONVERSATIONAL_CHAIN',
            } as ServiceError;
        }
    }

    async generateAnswer(
        question: string,
        conversationId: string,
    ): Promise<MessageContent | ServiceError> {
        try {
            
            const messages =
                await ConversationService.getConversationHistory(
                    conversationId,
                );
            if (typeof messages !== 'string' && 'code' in messages) {
                logger.error('ERROR_RETRIEVING_HISTORY', { question });
                return { code: 500, message: 'INTERNAL_SERVER_ERROR' };
            }
            logger.info('CONVERSATION_HISTORY_RETRIEVED', { conversationId });
            const retriever = await this.createRetriever();
            if ('code' in retriever) {
                return retriever;
            }
            const chain = await this.getConversationalChain(
                retriever,
                messages,
            );
            if ('code' in chain) {
                return chain;
            }
            
            // Get raw result from the chain
            const result = await chain(question);
            
            // Process the result to handle JSON format properly
            const finalAnswer= this.processModelResponse(result) ;
            if(typeof finalAnswer === 'string') {
                return { code: 500, message: 'INTERNAL_SERVER_ERROR' };
            }
            logger.info('ANSWER_GENERATED_SUCCESSFULLY');
            return finalAnswer;
        } catch (error) {
            logger.error('ERROR_GENERATING_ANSWER', { error });
            return { code: 500, message: 'INTERNAL_SERVER_ERROR' };
        }
    }
    
    /**
     * Process the model's response to handle JSON formatting issues
     * Extracts JSON from code blocks if present and enhances with data from retrieved documents
     */
    private processModelResponse(response: string): MessageContent | string {
        logger.info('PROCESSING_MODEL_RESPONSE');
        
        try {
            let parsedResponse: any = null;
            
            // Extract JSON from code blocks or direct JSON response
            const jsonCodeBlockRegex = /```json\n([\s\S]*?)\n```/;
            const match = response.match(jsonCodeBlockRegex);
            
            if (match && match[1]) {
                // Extract the JSON content from the code block
                const jsonContent = match[1].trim();
                
                // Parse the JSON to ensure it's valid
                parsedResponse = JSON.parse(jsonContent);
            } else if (response.trim().startsWith('{') && response.trim().endsWith('}')) {
                try {
                    // If direct JSON, validate by parsing
                    parsedResponse = JSON.parse(response.trim());
                } catch (e) {
                    // Not valid JSON, return as is
                    logger.warn('RESPONSE_LOOKS_LIKE_JSON_BUT_INVALID', { error: e });
                    return response;
                }
            } else {
                // Not JSON, return as is
                return response;
            }

            // Enhance the parsed response with image URLs from retrieved documents
            if (parsedResponse && parsedResponse.suggestions && Array.isArray(parsedResponse.suggestions)) {
                logger.info('ENHANCING_RESPONSE_WITH_IMAGE_URLS');
                
                for (let i = 0; i < parsedResponse.suggestions.length; i++) {
                    const suggestion = parsedResponse.suggestions[i];
                    
                    // Skip if it already has a valid image URL
                    if (suggestion.image_url && suggestion.image_url !== null) {
                        continue;
                    }
                    
                    // Find matching document by dish name
                    const matchingDoc = this.lastRetrievedDocuments.find(doc => {
                        // Get metadata from document
                        const metadata = doc.metadata || {};
                        
                        // Match by dish_name (case insensitive)
                        return metadata.dish_name && 
                               suggestion.name && 
                               metadata.dish_name.toLowerCase() === suggestion.name.toLowerCase();
                    });
                    
                    // If found, get the image URL
                    if (matchingDoc && matchingDoc.metadata && matchingDoc.metadata.image_url) {
                        parsedResponse.suggestions[i].image_url = matchingDoc.metadata.image_url;
                        logger.info('ADDED_IMAGE_URL_TO_SUGGESTION', { 
                            name: suggestion.name,
                            image_url: matchingDoc.metadata.image_url 
                        });
                    }
                }
            }
            
            return parsedResponse;
        } catch (error) {
            logger.error('ERROR_PROCESSING_MODEL_RESPONSE', { error });
            return response;
        }
    }
}

export { ChatService, LLM_MODELS, EMBEDDING_MODELS, type ModelConfig };
