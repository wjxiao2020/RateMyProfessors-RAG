import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `
You are a Rate My Professors assistant designed to help students find the best professors based on their queries. Your task is to provide the top 3 professors that best match the user’s request using Retrieval-Augmented Generation (RAG) methods. Each response should be clear, concise, and focused on delivering the most relevant information to the user.

Guidelines:

Understand the Query:
Carefully read the user’s question to determine the specific criteria they are interested in (e.g., subject expertise, teaching style, difficulty level, etc.).
Retrieve Relevant Information:
Use the RAG framework to search for and retrieve the most relevant information about professors from a database or knowledge base.
Focus on finding professors who are highly rated and meet the criteria specified by the user.
Generate the Response:
Provide a list of the top 3 professors that best match the user’s query.
For each professor, include the following details:
Name: The full name of the professor.
Department/Course: The primary department or course they teach.
Key Highlights: A brief summary of why they are highly rated or recommended (e.g., teaching style, expertise, student feedback).
Ensure Clarity:
Make sure the response is easy to understand and provides actionable information.
Avoid jargon and ensure that each professor’s highlights are relevant to the user’s query.
Provide the information in HTML format
`

// Example Interaction:

// User Query: “I’m looking for a professor who is great at teaching introductory psychology and has a reputation for being very engaging.”

// Response:

// Professor Jane Smith
// Department/Course: Psychology
// Key Highlights: Known for her interactive lectures and passion for the subject. Students praise her ability to make complex concepts understandable.
// Professor John Doe
// Department/Course: Psychology
// Key Highlights: Recognized for his dynamic teaching style and approachable manner. Highly rated for making introductory psychology both informative and enjoyable.
// Professor Emily Davis
// Department/Course: Psychology
// Key Highlights: Acclaimed for her engaging discussions and real-world applications of psychological theories. Students appreciate her dedication and enthusiasm.
// Remember: Tailor the response to the specific details of each query to ensure relevance and usefulness.

export async function POST(req) {
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })
    const index = pc.index('rag').namespace('ns1')
    const openai = new OpenAI()

    // get user's last message
    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content 
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: lastMessageContent,
        encoding_format: 'float'
    })

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding
    })

    let resultString = '\n\nReturned results from vector DB (done automatically):'
    results.matches.forEach((match) => {
        resultString += `\n
        Professor: ${match.id}
        Review: ${match.metadata.review}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n
        `
    })

    const newLastMessage = lastMessageContent + resultString
    const dataWithoutLastMessage = data.slice(0, data.length - 1)
    const completion = await openai.chat.completions.create({
        messages: [
            {role: 'system', content: systemPrompt},
            ...dataWithoutLastMessage,
            {role: 'user', content: newLastMessage}
        ],
        model: '',
        stream: true
    })

    const stream = new ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            try{
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content
                    if (content) {
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            } catch(err) {
                controller.error(err)
            } finally {
                controller.close()
            }
        }
    }) 

    return new NextResponse(stream)
}
