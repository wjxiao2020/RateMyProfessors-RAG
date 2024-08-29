import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { HfInference } from "@huggingface/inference";

const systemPrompt = `
You are a Rate My Professors assistant designed to help students find the best professors based on their queries. 
Your task is to provide the top professors that best match the user’s request using information provided. Each response should be clear, concise, and focused on delivering the most relevant information to the user.

Guidelines:

Carefully read the user’s question to determine the specific criteria they are interested in (e.g., subject expertise, teaching style, difficulty level, etc.).
The information of the top 3 professors with matching description will be given as context to you.
For each professor, determine if the professor has a matching department or a subject if the user have specified any. 
If the user specified a department or a subject, then don't give those professors that doesn't match the given department or subject. 
Include the following sections in your detailed explaination of why they are a good choice for the user:
Name: The full name of the professor.
Department/Course: The primary department or course they teach.
Key Highlights: A brief summary of why they are highly rated or recommended (e.g., teaching style, expertise, student feedback).

Make sure the response is easy to understand and provides actionable information.
Avoid jargon and ensure that each professor’s highlights are relevant to the user’s query.
You must reply in HTML format. Use <h1> to <h6> tag for each professor's name or the section header. Use line breaks after each section (Name, Department/Course, Key Highlights) of your explaination to make the answer easily readable.
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

const hf = new HfInference(process.env.HF_TOKEN)

export async function POST(req) {
    const data = await req.json()
    console.log("\nPOST data: ")
    console.log(data)
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })
    const index = pc.index('rag').namespace('ns1')
    const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
    })

    // get user's last message
    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content 
    const embedding = await hf.featureExtraction({
        model: 'WhereIsAI/UAE-Large-V1',
        inputs: lastMessageContent
    })

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding
    })

    // Returned results from vector DB (done automatically)
    let resultString = '\n\nTop-Matching Professors:'
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
        model: "meta-llama/llama-3.1-8b-instruct:free",
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
