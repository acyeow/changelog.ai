import OpenAI from "openai";
import { Document } from "@langchain/core/documents";

export const client = new OpenAI();

export const aiSummariseCommit = async (diff: string) => {
  const response = await client.responses.create({
    model: "gpt-4.1-nano-2025-04-14",
    input: `You are an expert progammer, and you are trying to summarise a git diff.
        Reminders about the git diff format:
        For every file, there are few metadata lines, like (for example):
        \`\`\`
        diff --git a/lib/index.js b/lib/index.js
        index aadf691..bfef603 100644
        --- a/lib/index.js
        +++ b/lib/index.js
        \`\`\`
        This means that \`lib/index.js\` was modified in this commit. Note that this is only an example.
        Then there is a specifer of the lines that were modified.
        A line starting with \`+\` means that it was added.
        A line starting with \`-\` means that it was deleted.
        A line starting with neither \'+\` nor \`-\` is code given for context and better understanding.
        It is not part of the diff.
        [...]
        EXAMPLE SUMMARY CONTENTS:
        \`\`\`
        * Raised the amount of returned recordings from \`10\` to \`100\` [packages/server/recordings_api.ts], [packages/server/constants.ts]
        * Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
        * Moved the \`octokit\` initialization into a separate file [src/octokit.ts], [src/index.ts]
        * Added an OpenAI API for completions [packages/utils/apis/openai.ts]
        * Lowered numeric tolerance for test files
        \`\`\`
        Most commits will have less comments than the examples in this list.
        The last comment does not include the file names,
        because there were more that two relevant files in the hypothetical commit.
        Do not include parts of the example in your summary.
        It it given only as an example of appropriate contents.
        Do not preface your summary with anything.
        Only include bullet points.
        
      Please summarise the following diff file: \n\n${diff}`,
  });
  return response.output_text;
};

export async function summariseCode(doc: Document) {
  console.log("getting summary for", doc.metadata.source);
  const code = doc.pageContent.slice(0, 10000);
  const response = await client.responses.create({
    model: "gpt-4.1-nano-2025-04-14",
    input: `You are an intelligent senior software engineer who specialises in onboarding junior engineers onto projects.
    You are onboarding a junior software engineer and explaining to them the purpose of the ${doc.metadata.source} file.
    Here is the code:
    ---
    ${code}
    ---
    Give a summary no more than 100 words of the code above.`,
  });
  return response.output_text;
}

export async function generateEmbedding(summary: string) {
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: summary,
  });
  return response.data[0]?.embedding;
}

// await aiSummariseCommit(`diff --git a/modules/redisbloom/Makefile b/modules/redisbloom/Makefile
// index 7aac7a5c3f9..2b2e09f07bb 100644
// --- a/modules/redisbloom/Makefile
// +++ b/modules/redisbloom/Makefile
// @@ -1,5 +1,5 @@
//  SRC_DIR = src
// -MODULE_VERSION = v8.0.0
// +MODULE_VERSION = v8.0.1
//  MODULE_REPO = https://github.com/redisbloom/redisbloom
//  TARGET_MODULE = $(SRC_DIR)/bin/$(FULL_VARIANT)/redisbloom.so

// diff --git a/modules/redisjson/Makefile b/modules/redisjson/Makefile
// index 7d314914ff8..269c91ecf32 100644
// --- a/modules/redisjson/Makefile
// +++ b/modules/redisjson/Makefile
// @@ -1,5 +1,5 @@
//  SRC_DIR = src
// -MODULE_VERSION = v8.0.0
// +MODULE_VERSION = v8.0.1
//  MODULE_REPO = https://github.com/redisjson/redisjson
//  TARGET_MODULE = $(SRC_DIR)/bin/$(FULL_VARIANT)/rejson.so

// diff --git a/modules/redistimeseries/Makefile b/modules/redistimeseries/Makefile
// index 6f196fcde3c..32c8eec8174 100644
// --- a/modules/redistimeseries/Makefile
// +++ b/modules/redistimeseries/Makefile
// @@ -1,5 +1,5 @@
//  SRC_DIR = src
// -MODULE_VERSION = v8.0.0
// +MODULE_VERSION = v8.0.1
//  MODULE_REPO = https://github.com/redistimeseries/redistimeseries
//  TARGET_MODULE = $(SRC_DIR)/bin/$(FULL_VARIANT)/redistimeseries.so
// `)
//   .then(console.log)
//   .catch(console.error);
