import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";

const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
})

const prompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are a smart, fridenly AI assistant.
        Answer questions clearly and helpfully.
        If you don't know something, say so honestly.
        Keep responses concise but thorough.`,
    ],
    new MessagesPlaceholder("chat_history"),
    ["human", "{question}"],
])

// const chain = prompt.pipe(llm).pipe(new StringOutputParser());

const sessions = new Map();

function getSession(sessionId){
    if(!sessions.has(sessionId)){
        sessions.set(sessionId, []);
    }

    return sessions.get(sessionId);
}

export async function* streamChat(sessionId, question) {
  const history = getSession(sessionId)

    const streamChain = prompt.pipe(llm).pipe(new StringOutputParser());
    console.log({question}, "Question and chat history")
    const stream = await streamChain.stream({
        question,
        chat_history: history,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
        fullResponse += chunk;
        yield chunk;
    }

    history.push(new HumanMessage(question));
    history.push(new AIMessage(fullResponse));

    if(history.length > 20) history.splice(0, 2);
}

