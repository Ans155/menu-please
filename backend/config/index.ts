export const config = {
    server: {
        port: process.env.PORT_X,
    },
    database: {
        mongo: {
            uri: process.env.MONGO_URI_X,
            namespace:process.env.NAMESPACE,
            indexName:process.env.INDEX_NAME 
        },
    },
    openAI: {
        key: process.env.OPENAI_API_KEY,
    },
    geminiAI: {
        key: process.env.GOOGLE_API_KEY,
    },


};
