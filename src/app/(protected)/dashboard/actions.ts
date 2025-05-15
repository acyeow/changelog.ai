"use server";

import { OpenAI } from "openai";
import { generateEmbedding } from "~/lib/openai";
import { db } from "~/server/db";
const client = new OpenAI();

// Define interface for raw database result
interface RawSimilarityResult {
  fileName: string;
  sourceCode: string;
  summary: string;
  summaryEmbedding: string;
}

export async function askQuestion(question: string, projectId: string) {
  const queryVector = await generateEmbedding(question);
  const vectorQuery = `[${queryVector?.join(",")}]`;

  // Modified query: include summary field and get all needed data
  const result = await db.$queryRaw<RawSimilarityResult[]>`
      SELECT 
        "fileName", 
        "sourceCode",
        "summary",
        "summaryEmbedding"::text as "summaryEmbedding"
      FROM "SourceCodeEmbedding"
      WHERE "projectId" = ${projectId}
  `;

  console.log("Raw results count:", result.length);

  const processedQueryVector = parseVectorString(vectorQuery);

  // Process results with similarity calculation in JavaScript
  const processedResults = result
    .map((row) => {
      const rowVector = parseVectorString(row.summaryEmbedding);
      const similarity = calculateCosineSimilarity(
        rowVector,
        processedQueryVector,
      );

      return {
        fileName: row.fileName,
        sourceCode: row.sourceCode,
        summary: row.summary,
        similarity,
      };
    })
    .filter((row) => row.similarity > 0.2) // Using lower threshold of 0.2
    .sort((a, b) => b.similarity - a.similarity) // Sort by similarity, highest first
    .slice(0, 10); // Take top 10

  console.log("Filtered results count:", processedResults.length);
  console.log(
    "Similarity scores:",
    processedResults.map((r) => ({
      file: r.fileName,
      similarity: r.similarity,
    })),
  );

  if (processedResults.length === 0) {
    throw new Error(
      "No relevant files found - consider adjusting your similarity threshold or query",
    );
  }

  let context = "";

  for (const doc of processedResults) {
    context += `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\nsummary of file: ${doc.summary}\n\n`;
  }

  console.log("context", context);

  // Create the response from OpenAI
  const response = await client.responses.create({
    model: "gpt-4.1-nano-2025-04-14",
    input: [
      {
        role: "user",
        content: `You are an ai code assistant who answers question about the codebas. Your target audience is a technical intern who is onboarding onto the project.
        AI assistant is a brand new, powerful, human-like artificial intelligence.
        The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
        AI is a wel-behaved and well-mannered individual.
        AI is always friendly, kind, and insipiring, and he is eager to provide vivid and thoughful respoonses to the user.
        AI has the sum of all the knowledge in their brain, and is able to accurately answer nearly any question about any topic in software engineering.
        If the question is asking about code or a specific file, AI will provide the detailed answer, giving step by step instructions.
        START CONTEXT BLOCK
        ${context}
        END CONTEXT BLOCK

        START QUESTION
        ${question}
        END QUESTION
        AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
        If the context does not provide the answer to the question, the AI assistant will say "I'm sorry, but I don't know the answer to that question based on the provided context."
        AI assistant will not apologize for previous responses, but instead will indicate new information was gained.
        AI assistant will not invent anything that is not drawn directly from the context.
        Answer in markdown syntax, with code snippets if needed. Bes as detailed as possible when answering, make sure thereis no ambiguity in your answer.
        `,
      },
    ],
  });

  // Instead of iterating over the stream and logging,
  // simply return the response
  return {
    output: response.output_text,
    filesReference: processedResults,
  };
}

// Helper function to convert PostgreSQL vector string format back to array of numbers
function parseVectorString(vectorString: string): number[] {
  // Remove brackets and split by commas, then convert to numbers
  if (!vectorString) return [];
  return vectorString
    .replace(/[\[\]]/g, "")
    .split(",")
    .map((num) => parseFloat(num.trim()));
}

// Calculate cosine similarity between two vectors
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    console.warn("Vector dimensions don't match:", vecA.length, vecB.length);
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    if (vecA[i] !== undefined && vecB[i] !== undefined) {
      dotProduct += vecA[i]! * vecB[i]!;
      normA += vecA[i]! * vecA[i]!;
      normB += vecB[i]! * vecB[i]!;
    }
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }
  let result = dotProduct / (normA * normB);

  return result;
}
