import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "@langchain/core/documents";
import { generateEmbedding, summariseCode } from "./openai";
import { db } from "~/server/db";
import { delay } from "./utils";

export const loadGithubRepo = async (
  githubUrl: string,
  githubToken?: string,
  branch: string = "main",
) => {
  const loader = new GithubRepoLoader(githubUrl, {
    accessToken: githubToken || "",
    branch,
    ignoreFiles: [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "bun.lockb",
    ],
    recursive: true,
    unknown: "warn",
    maxConcurrency: 5,
  });

  try {
    return await loader.load();
  } catch (error) {
    console.error("Error loading GitHub repository:", error);
    console.warn("Retrying after 10 seconds...");
    await delay(10000); // Introduce a 10-second delay
    return await loader.load(); // Retry loading the repository
  }
};

// console.log(await loadGithubRepo("https://github.com/acyeow/165a-l-store-project"))

const sanitizeString = (input: string): string => {
  return input.replace(/\0/g, ""); // Remove null bytes
};

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
  branch: string = "main", // Default to main if no branch is provided
) => {
  console.log(`Loading repo ${githubUrl} with branch ${branch}`);
  const docs = await loadGithubRepo(githubUrl, githubToken, branch);
  const allEmbeddings = await generateEmbeddings(docs);
  await Promise.allSettled(
    allEmbeddings.map(async (embedding, index) => {
      console.log(`processing ${index + 1} of ${allEmbeddings.length}`);
      if (!embedding) return;
      const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
        data: {
          summary: sanitizeString(embedding.summary), // Sanitize summary
          sourceCode: sanitizeString(embedding.sourceCode), // Sanitize sourceCode
          fileName: sanitizeString(embedding.fileName), // Sanitize fileName
          projectId,
        },
      });

      await db.$executeRaw`
      UPDATE "SourceCodeEmbedding"
      SET "summaryEmbedding" = ${embedding.embedding}::vector
      WHERE "id" = ${sourceCodeEmbedding.id}
      `;
    }),
  );
};

const generateEmbeddings = async (docs: Document[]) => {
  return await Promise.all(
    docs.map(async (doc) => {
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          const summary = await summariseCode(doc);
          const embedding = await generateEmbedding(summary);
          return {
            summary,
            embedding,
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source,
          };
        } catch (error: any) {
          if (error.response?.status === 429) {
            attempts++;
            console.warn(
              `Rate limit hit while generating embeddings. Retrying in 60 seconds... (Attempt ${attempts}/${maxAttempts})`,
            );
            await delay(60000); // Wait for 60 seconds
          } else {
            throw error; // Re-throw if not a 429 error
          }
        }
      }

      throw new Error(
        "Failed to generate embeddings after multiple attempts due to rate limiting.",
      );
    }),
  );
};
